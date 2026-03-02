export const mockUsers = [];
export const mockFriends = [];
export const mockMessages = [];
export const generateMockUser = () => ({ id: Math.random().toString(), nickname: 'TestUser' });
export default { mockUsers, mockFriends, mockMessages, generateMockUser };
