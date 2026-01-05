require("dotenv").config();

const fs = require("fs");
const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");
const { PrismaClient } = require("@prisma/client");
const { customAlphabet } = require("nanoid");
const { getWheelData, pickWheel1, pickWheel2, pickTruthQuestion } = require("./game/wheels");

const prisma = new PrismaClient();

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const ROOM_CODE_LENGTH = 6;
const MAX_PLAYERS = 20;
const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/wheels", (req, res) => {
  res.json(getWheelData());
});

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    credentials: true
  }
});

const makeRoomCode = customAlphabet(ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH);
const roomTimers = new Map();
const playerSockets = new Map();

function getDefaultSettings() {
  return {
    timerSeconds: 120,
    autoQueue: true,
    disqualifiedCanPlay: false,
    turnIndex: 0
  };
}

function parseSettings(raw) {
  if (!raw) {
    return null;
  }
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }
  if (typeof raw === "object") {
    return raw;
  }
  return null;
}

function normalizeSettings(raw) {
  const defaults = getDefaultSettings();
  const parsed = parseSettings(raw);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return { ...defaults, ...parsed };
  }
  return defaults;
}

function serializeSettings(raw) {
  return JSON.stringify(normalizeSettings(raw));
}

function normalizeName(name) {
  return String(name || "").trim();
}

function makeUniqueName(baseName, takenNames) {
  if (!takenNames.includes(baseName.toLowerCase())) {
    return baseName;
  }
  let index = 2;
  let candidate = `${baseName} #${index}`;
  while (takenNames.includes(candidate.toLowerCase())) {
    index += 1;
    candidate = `${baseName} #${index}`;
  }
  return candidate;
}

async function generateRoomCode() {
  let code = makeRoomCode();
  let existing = await prisma.room.findUnique({ where: { code } });
  while (existing) {
    code = makeRoomCode();
    existing = await prisma.room.findUnique({ where: { code } });
  }
  return code;
}

function getWheelLookup() {
  const data = getWheelData();
  const byId = new Map();
  data.categories.forEach((category) => {
    byId.set(category.id, category);
  });
  return { data, byId };
}

function serializeRound(round, spin, voteCounts) {
  if (!round) {
    return null;
  }
  const { data, byId } = getWheelLookup();
  const wheel1Category = spin && spin.wheel1Result ? byId.get(spin.wheel1Result) : null;
  const wheel2Item = wheel1Category && spin && spin.wheel2Result
    ? wheel1Category.items.find((item) => item.id === spin.wheel2Result)
    : null;
  const wheel1Id = spin?.wheel1Result || null;
  const wheel2Id = spin?.wheel2Result || null;

  return {
    id: round.id,
    roomId: round.roomId,
    startedAt: round.startedAt,
    endedAt: round.endedAt,
    currentPlayerId: round.currentPlayerId,
    mode: round.mode,
    timerSeconds: round.timerSeconds,
    phase: round.phase,
    result: round.result,
    wheel1Result: wheel1Category ? wheel1Category.title : null,
    wheel1Id,
    wheel2Result: wheel2Item ? wheel2Item.shortTitle || wheel2Item.label : null,
    wheel2Id,
    finalText: spin ? spin.finalText : null,
    voteCounts
  };
}

async function buildRoomState(roomId) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) {
    return null;
  }
  const settings = normalizeSettings(room.settings);
  const players = await prisma.player.findMany({
    where: { roomId },
    orderBy: { joinedAt: "asc" }
  });
  const round = await prisma.round.findFirst({
    where: { roomId },
    orderBy: { startedAt: "desc" },
    include: { spins: true, votes: true }
  });

  const spin = round && round.spins.length ? round.spins[0] : null;
  const voteCounts = round
    ? round.votes.reduce(
        (acc, vote) => {
          acc.total += 1;
          if (vote.vote === "approve") {
            acc.approve += 1;
          }
          if (vote.vote === "report") {
            acc.report += 1;
          }
          return acc;
        },
        { approve: 0, report: 0, total: 0 }
      )
    : { approve: 0, report: 0, total: 0 };

  return {
    room: {
      id: room.id,
      code: room.code,
      hostId: room.hostId,
      settings
    },
    players,
    round: serializeRound(round, spin, voteCounts),
    content: getWheelData()
  };
}

function ensureHost(room, socket) {
  return socket.data.playerId && room.hostId === socket.data.playerId;
}

async function touchPlayer(socket) {
  if (!socket.data.playerId) {
    return;
  }
  try {
    await prisma.player.update({
      where: { id: socket.data.playerId },
      data: { lastSeen: new Date() }
    });
  } catch (error) {
    // Ignore missing player records (e.g., kicked/disconnected).
  }
}

async function emitRoomState(roomId) {
  const state = await buildRoomState(roomId);
  if (!state) {
    return;
  }
  io.to(roomId).emit("player:list", state.players);
  io.to(roomId).emit("room:state", state);
}

function selectNextPlayer(players, startIndex, allowDisqualified) {
  if (!players.length) {
    return null;
  }
  const total = players.length;
  for (let offset = 0; offset < total; offset += 1) {
    const idx = (startIndex + offset) % total;
    const candidate = players[idx];
    if (allowDisqualified || candidate.status === "active") {
      return { player: candidate, nextIndex: (idx + 1) % total };
    }
  }
  return null;
}

function stopTimer(roomId) {
  const entry = roomTimers.get(roomId);
  if (entry) {
    clearInterval(entry.intervalId);
    roomTimers.delete(roomId);
  }
}

async function startTimer(roomId, roundId, seconds) {
  stopTimer(roomId);
  let remaining = seconds;
  io.to(roomId).emit("round:timer_tick", { roundId, remaining });
  const intervalId = setInterval(async () => {
    remaining -= 1;
    io.to(roomId).emit("round:timer_tick", { roundId, remaining });
    if (remaining <= 0) {
      await endTimer(roomId, roundId, "timeout");
    }
  }, 1000);

  roomTimers.set(roomId, { intervalId, roundId, remaining });
}

async function endTimer(roomId, roundId, reason) {
  const timer = roomTimers.get(roomId);
  if (timer && timer.roundId !== roundId) {
    return;
  }
  stopTimer(roomId);
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.phase !== "task") {
    return;
  }
  await prisma.round.update({
    where: { id: roundId },
    data: { phase: "voting" }
  });
  io.to(roomId).emit("round:timer_end", { roundId, reason });
  await emitRoomState(roomId);
  await maybeFinalizeVote(roomId, roundId);
}

function getMajorityThreshold(eligibleCount) {
  return Math.floor(eligibleCount / 2) + 1;
}

async function applyStrike(playerId, roomId) {
  const updated = await prisma.player.update({
    where: { id: playerId },
    data: { strikes: { increment: 1 } }
  });
  io.to(roomId).emit("player:strike", { playerId, strikes: updated.strikes });

  if (updated.strikes >= 2 && updated.status !== "disqualified") {
    const disqualified = await prisma.player.update({
      where: { id: playerId },
      data: { status: "disqualified" }
    });
    io.to(roomId).emit("player:update_status", {
      playerId,
      status: disqualified.status
    });
  }
}

async function maybeFinalizeVote(roomId, roundId) {
  const round = await prisma.round.findUnique({ where: { id: roundId } });
  if (!round || round.phase !== "voting") {
    return;
  }
  const playersCount = await prisma.player.count({ where: { roomId } });
  const eligibleCount = Math.max(playersCount - 1, 0);
  const votes = await prisma.vote.findMany({ where: { roundId } });
  const counts = votes.reduce(
    (acc, vote) => {
      acc.total += 1;
      if (vote.vote === "approve") {
        acc.approve += 1;
      }
      if (vote.vote === "report") {
        acc.report += 1;
      }
      return acc;
    },
    { approve: 0, report: 0, total: 0 }
  );

  if (eligibleCount === 0) {
    await prisma.round.update({
      where: { id: roundId },
      data: { phase: "complete", result: "not_approved", endedAt: new Date() }
    });
    io.to(roomId).emit("vote:result", {
      roundId,
      result: "not_approved",
      counts,
      threshold: 0
    });
    await emitRoomState(roomId);
    return;
  }

  if (counts.total < eligibleCount) {
    return;
  }

  const threshold = getMajorityThreshold(eligibleCount);
  let result = "not_approved";
  if (counts.approve >= threshold) {
    result = "approved";
  } else if (counts.report >= threshold) {
    result = "report";
  }

  await prisma.round.update({
    where: { id: roundId },
    data: { phase: "complete", result, endedAt: new Date() }
  });

  if (result === "report" && round.currentPlayerId) {
    await applyStrike(round.currentPlayerId, roomId);
  }

  io.to(roomId).emit("vote:result", {
    roundId,
    result,
    counts,
    threshold
  });
  await emitRoomState(roomId);
}

io.on("connection", (socket) => {
  socket.on("room:create", async (payload, ack) => {
    const name = normalizeName(payload?.name);
    if (!name) {
      if (ack) {
        ack({ ok: false, error: "Name required" });
      }
      return;
    }
    const code = await generateRoomCode();
    const settings = getDefaultSettings();

    const room = await prisma.room.create({
      data: {
        code,
        hostId: "pending",
        settings: serializeSettings(settings)
      }
    });
    const player = await prisma.player.create({
      data: {
        roomId: room.id,
        name
      }
    });
    await prisma.room.update({
      where: { id: room.id },
      data: { hostId: player.id }
    });

    socket.data.roomId = room.id;
    socket.data.playerId = player.id;
    playerSockets.set(player.id, socket.id);
    socket.join(room.id);

    const state = await buildRoomState(room.id);
    io.to(room.id).emit("player:list", state.players);
    io.to(room.id).emit("room:state", state);

    if (ack) {
      ack({ ok: true, state, playerId: player.id });
    }
  });

  socket.on("room:join", async (payload, ack) => {
    const name = normalizeName(payload?.name);
    const code = normalizeName(payload?.code).toUpperCase();
    if (!name || !code) {
      if (ack) {
        ack({ ok: false, error: "Name and code required" });
      }
      return;
    }

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      if (ack) {
        ack({ ok: false, error: "Room not found" });
      }
      return;
    }

    const players = await prisma.player.findMany({
      where: { roomId: room.id }
    });
    if (players.length >= MAX_PLAYERS) {
      if (ack) {
        ack({ ok: false, error: "Room is full" });
      }
      return;
    }

    const takenNames = players.map((player) => player.name.toLowerCase());
    const finalName = makeUniqueName(name, takenNames);

    const player = await prisma.player.create({
      data: {
        roomId: room.id,
        name: finalName
      }
    });

    socket.data.roomId = room.id;
    socket.data.playerId = player.id;
    playerSockets.set(player.id, socket.id);
    socket.join(room.id);

    const state = await buildRoomState(room.id);
    io.to(room.id).emit("player:list", state.players);
    io.to(room.id).emit("room:state", state);

    if (ack) {
      ack({ ok: true, state, playerId: player.id });
    }
  });

  socket.on("room:state", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const state = await buildRoomState(socket.data.roomId);
    if (ack) {
      ack({ ok: true, state });
    } else if (state) {
      socket.emit("room:state", state);
    }
  });

  socket.on("round:start", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }

    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }

    const activeRound = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (activeRound) {
      if (ack) {
        ack({ ok: false, error: "Round already active" });
      }
      return;
    }

    const players = await prisma.player.findMany({
      where: { roomId: room.id },
      orderBy: { joinedAt: "asc" }
    });
    if (!players.length) {
      if (ack) {
        ack({ ok: false, error: "No players" });
      }
      return;
    }

    let settings = normalizeSettings(room.settings);
    let currentPlayerId = payload?.playerId || null;
    if (currentPlayerId) {
      const chosen = players.find((player) => player.id === currentPlayerId);
      if (!chosen) {
        if (ack) {
          ack({ ok: false, error: "Player not found" });
        }
        return;
      }
      if (!settings.disqualifiedCanPlay && chosen.status !== "active") {
        if (ack) {
          ack({ ok: false, error: "Player is disqualified" });
        }
        return;
      }
    } else if (settings.autoQueue) {
      const selection = selectNextPlayer(players, settings.turnIndex || 0, settings.disqualifiedCanPlay);
      if (!selection) {
        if (ack) {
          ack({ ok: false, error: "No eligible players" });
        }
        return;
      }
      currentPlayerId = selection.player.id;
      settings = { ...settings, turnIndex: selection.nextIndex };
      await prisma.room.update({
        where: { id: room.id },
        data: { settings: serializeSettings(settings) }
      });
    } else {
      if (ack) {
        ack({ ok: false, error: "Pick a player or enable auto queue" });
      }
      return;
    }

    const round = await prisma.round.create({
      data: {
        roomId: room.id,
        currentPlayerId,
        timerSeconds: settings.timerSeconds || 120,
        phase: "mode"
      }
    });

    io.to(room.id).emit("round:start", {
      roundId: round.id,
      currentPlayerId: round.currentPlayerId,
      timerSeconds: round.timerSeconds
    });
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("round:mode", async (payload, ack) => {
    await touchPlayer(socket);
    const mode = payload?.mode;
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const round = await prisma.round.findFirst({
      where: { roomId: socket.data.roomId, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round) {
      if (ack) {
        ack({ ok: false, error: "Round not found" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (
      socket.data.playerId !== round.currentPlayerId &&
      (!room || !ensureHost(room, socket))
    ) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }
    if (mode !== "truth" && mode !== "dare") {
      if (ack) {
        ack({ ok: false, error: "Invalid mode" });
      }
      return;
    }
    if (mode === "truth") {
      const selection = pickTruthQuestion();
      if (!selection) {
        if (ack) {
          ack({ ok: false, error: "Truth questions missing" });
        }
        return;
      }
      const finalText = selection.question;
      await prisma.spin.upsert({
        where: { roundId: round.id },
        create: {
          roundId: round.id,
          wheel1Result: "",
          wheel2Result: "",
          finalText
        },
        update: {
          wheel1Result: "",
          wheel2Result: "",
          finalText
        }
      });
      await prisma.round.update({
        where: { id: round.id },
        data: { mode, phase: "task" }
      });
      io.to(room.id).emit("spin:final", {
        roundId: round.id,
        finalText,
        mode
      });
      await emitRoomState(room.id);
      await startTimer(room.id, round.id, round.timerSeconds || 120);

      if (ack) {
        ack({ ok: true });
      }
      return;
    }

    await prisma.round.update({
      where: { id: round.id },
      data: { mode, phase: "wheel1" }
    });
    io.to(room.id).emit("round:start", {
      roundId: round.id,
      currentPlayerId: round.currentPlayerId,
      mode
    });
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("spin:wheel1_start", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "wheel1") {
      if (ack) {
        ack({ ok: false, error: "Wheel1 not ready" });
      }
      return;
    }

    if (
      socket.data.playerId !== round.currentPlayerId &&
      (!room || !ensureHost(room, socket))
    ) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }

    io.to(room.id).emit("spin:wheel1_start", { roundId: round.id });
    const { category, index } = pickWheel1();

    await prisma.spin.upsert({
      where: { roundId: round.id },
      create: {
        roundId: round.id,
        wheel1Result: category.id,
        wheel2Result: "",
        finalText: ""
      },
      update: {
        wheel1Result: category.id
      }
    });

    await prisma.round.update({
      where: { id: round.id },
      data: { phase: "wheel2" }
    });

    io.to(room.id).emit("spin:wheel1_result", {
      roundId: round.id,
      categoryId: category.id,
      categoryTitle: category.title,
      index
    });

    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("spin:wheel2_start", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "wheel2") {
      if (ack) {
        ack({ ok: false, error: "Wheel2 not ready" });
      }
      return;
    }

    if (
      socket.data.playerId !== round.currentPlayerId &&
      (!room || !ensureHost(room, socket))
    ) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }

    const spin = await prisma.spin.findUnique({ where: { roundId: round.id } });
    if (!spin || !spin.wheel1Result) {
      if (ack) {
        ack({ ok: false, error: "Wheel1 missing" });
      }
      return;
    }

    io.to(room.id).emit("spin:wheel2_start", { roundId: round.id });

    const selection = pickWheel2(spin.wheel1Result);
    if (!selection) {
      if (ack) {
        ack({ ok: false, error: "Wheel2 data missing" });
      }
      return;
    }

    const finalText = `${selection.category.title}: ${selection.item.text}`;
    await prisma.spin.update({
      where: { roundId: round.id },
      data: {
        wheel2Result: selection.item.id,
        finalText
      }
    });

    await prisma.round.update({
      where: { id: round.id },
      data: { phase: "task" }
    });

    io.to(room.id).emit("spin:wheel2_result", {
      roundId: round.id,
      itemId: selection.item.id,
      itemLabel: selection.item.shortTitle || selection.item.label,
      itemText: selection.item.text,
      index: selection.index
    });
    io.to(room.id).emit("spin:final", {
      roundId: round.id,
      finalText,
      categoryTitle: selection.category.title,
      itemText: selection.item.text
    });

    await emitRoomState(room.id);
    await startTimer(room.id, round.id, round.timerSeconds || 120);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("round:done", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "task") {
      if (ack) {
        ack({ ok: false, error: "Round not in task" });
      }
      return;
    }
    if (
      socket.data.playerId !== round.currentPlayerId &&
      (!room || !ensureHost(room, socket))
    ) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }
    await endTimer(room.id, round.id, "done");
    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("round:refuse", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "task") {
      if (ack) {
        ack({ ok: false, error: "Round not in task" });
      }
      return;
    }
    if (round.mode !== "truth") {
      if (ack) {
        ack({ ok: false, error: "Refuse only for truth" });
      }
      return;
    }
    if (
      socket.data.playerId !== round.currentPlayerId &&
      (!room || !ensureHost(room, socket))
    ) {
      if (ack) {
        ack({ ok: false, error: "Not allowed" });
      }
      return;
    }
    stopTimer(room.id);
    if (round.currentPlayerId) {
      await applyStrike(round.currentPlayerId, room.id);
    }
    await prisma.round.update({
      where: { id: round.id },
      data: { phase: "complete", result: "report", endedAt: new Date() }
    });
    io.to(room.id).emit("round:refuse", { roundId: round.id });
    await emitRoomState(room.id);
    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("vote:cast", async (payload, ack) => {
    await touchPlayer(socket);
    const vote = payload?.vote;
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const round = await prisma.round.findFirst({
      where: { roomId: socket.data.roomId, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "voting") {
      if (ack) {
        ack({ ok: false, error: "Voting not active" });
      }
      return;
    }
    if (!socket.data.playerId || socket.data.playerId === round.currentPlayerId) {
      if (ack) {
        ack({ ok: false, error: "Current player cannot vote" });
      }
      return;
    }
    if (vote !== "approve" && vote !== "report") {
      if (ack) {
        ack({ ok: false, error: "Invalid vote" });
      }
      return;
    }

    try {
      await prisma.vote.create({
        data: {
          roundId: round.id,
          voterPlayerId: socket.data.playerId,
          vote
        }
      });
    } catch (error) {
      if (ack) {
        ack({ ok: false, error: "Already voted" });
      }
      return;
    }

    const votes = await prisma.vote.findMany({ where: { roundId: round.id } });
    const counts = votes.reduce(
      (acc, entry) => {
        acc.total += 1;
        if (entry.vote === "approve") {
          acc.approve += 1;
        }
        if (entry.vote === "report") {
          acc.report += 1;
        }
        return acc;
      },
      { approve: 0, report: 0, total: 0 }
    );
    const playersCount = await prisma.player.count({ where: { roomId: socket.data.roomId } });
    const eligibleCount = Math.max(playersCount - 1, 0);

    io.to(socket.data.roomId).emit("vote:update", {
      roundId: round.id,
      counts,
      eligibleCount
    });

    await maybeFinalizeVote(socket.data.roomId, round.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("admin:kick", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }
    const targetId = payload?.playerId;
    if (!targetId) {
      if (ack) {
        ack({ ok: false, error: "Player required" });
      }
      return;
    }
    if (targetId === room.hostId) {
      if (ack) {
        ack({ ok: false, error: "Cannot kick host" });
      }
      return;
    }

    const activeRound = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (activeRound && activeRound.currentPlayerId === targetId) {
      stopTimer(room.id);
      await prisma.round.update({
        where: { id: activeRound.id },
        data: { phase: "complete", result: "skipped", endedAt: new Date() }
      });
      io.to(room.id).emit("admin:skip_round", { roundId: activeRound.id });
    }

    await prisma.player.delete({ where: { id: targetId } });

    const targetSocketId = playerSockets.get(targetId);
    if (targetSocketId) {
      io.to(targetSocketId).emit("admin:kick", { reason: "kicked" });
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.disconnect(true);
      }
    }

    playerSockets.delete(targetId);
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("admin:reset_room", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }

    stopTimer(room.id);
    await prisma.vote.deleteMany({ where: { round: { roomId: room.id } } });
    await prisma.spin.deleteMany({ where: { round: { roomId: room.id } } });
    await prisma.round.deleteMany({ where: { roomId: room.id } });
    await prisma.player.updateMany({
      where: { roomId: room.id },
      data: { strikes: 0, status: "active" }
    });
    const settings = { ...normalizeSettings(room.settings), turnIndex: 0 };
    await prisma.room.update({
      where: { id: room.id },
      data: { settings: serializeSettings(settings) }
    });

    io.to(room.id).emit("admin:reset_room", { roomId: room.id });
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("admin:skip_round", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }

    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round) {
      if (ack) {
        ack({ ok: false, error: "No active round" });
      }
      return;
    }
    stopTimer(room.id);
    await prisma.round.update({
      where: { id: round.id },
      data: { phase: "complete", result: "skipped", endedAt: new Date() }
    });

    io.to(room.id).emit("admin:skip_round", { roundId: round.id });
    await emitRoomState(room.id);

    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("admin:reset_timer", async (payload, ack) => {
    await touchPlayer(socket);
    if (!socket.data.roomId) {
      if (ack) {
        ack({ ok: false, error: "Not in room" });
      }
      return;
    }
    const room = await prisma.room.findUnique({ where: { id: socket.data.roomId } });
    if (!room || !ensureHost(room, socket)) {
      if (ack) {
        ack({ ok: false, error: "Host only" });
      }
      return;
    }
    const round = await prisma.round.findFirst({
      where: { roomId: room.id, endedAt: null },
      orderBy: { startedAt: "desc" }
    });
    if (!round || round.phase !== "task") {
      if (ack) {
        ack({ ok: false, error: "Timer not active" });
      }
      return;
    }
    await startTimer(room.id, round.id, round.timerSeconds || 120);
    if (ack) {
      ack({ ok: true });
    }
  });

  socket.on("disconnect", async () => {
    if (socket.data.playerId) {
      try {
        await prisma.player.update({
          where: { id: socket.data.playerId },
          data: { lastSeen: new Date() }
        });
      } catch (error) {
        // Ignore missing player records.
      }
      playerSockets.delete(socket.data.playerId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
