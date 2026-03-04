// Utilities for mapping User records to public payloads
// (add derived frameSlug from UserCustomization.frameAll)

function toPublicUser(user) {
  if (!user) return user;

  const customization = user.customization || null;

  const frameSlug = customization?.frameAll ?? null;

  // nicknameStyle is a legacy payload shape used across the client.
  // In DB it's stored as UserCustomization + relations.
  const nicknameStyle = customization
    ? {
        colorType: customization.nicknameColorType,
        customColor: customization.nicknameCustomColor,
        gradient: customization.nicknameGradient?.cssValue
          ? { cssValue: customization.nicknameGradient.cssValue }
          : null,
        glow: customization.nicknameGlow?.cssValue
          ? { cssValue: customization.nicknameGlow.cssValue }
          : null,
      }
    : null;

  const { customization: _c, ...rest } = user;

  return {
    ...rest,
    // legacy aliases used on client
    odlerId: user.visitorId ?? null,
    avatar: user.avatarUrl ?? null,
    frameSlug,
    nicknameStyle,
  };
}

module.exports = {
  toPublicUser,
};
