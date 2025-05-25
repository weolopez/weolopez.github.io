export const themeColors = {
  library: '#d4c99d',
  armory: '#c9d4a3',
  'dining hall': '#d4b0b0',
  prison: '#bcc2d4',
  storeroom: '#dcd4b0',
  defaultCorridor: '#e8e8e8',
  door: '#663300',
  wall: '#333333',
  'Indoor Jungle': '#00ff00'
};

export const roomThemes = Object.keys(themeColors).filter(theme => theme !== 'defaultCorridor' && theme !== 'door' && theme !== 'wall');

export const monsterPool = [
  { name: 'Goblin', health: 10, attack: 2, behavior: 'aggressive' },
  { name: 'Skeleton', health: 15, attack: 3, behavior: 'patrolling' },
  { name: 'Orc', health: 25, attack: 5, behavior: 'aggressive' },
  { name: 'Rat', health: 5, attack: 1, behavior: 'passive' }
];

export const themes = {
  library: {
    color: '#d4c99d',
    monsters: [
      { name: 'Book Golem', health: 20, attack: 4, behavior: 'aggressive' },
      { name: 'Librarian Ghost', health: 15, attack: 3, behavior: 'patrolling' }
    ]
  },
  armory: {
    color: '#c9d4a3',
    monsters: [
      { name: 'Armored Knight', health: 30, attack: 6, behavior: 'aggressive' },
      { name: 'Guard Dog', health: 10, attack: 2, behavior: 'aggressive' }
    ]
  },
  'dining hall': {
    color: '#d4b0b0',
    monsters: [
      { name: 'Chef', health: 15, attack: 3, behavior: 'aggressive' },
      { name: 'Rat', health: 5, attack: 1, behavior: 'passive' }
    ]
  },
  prison: {
    color: '#bcc2d4',
    monsters: [
      { name: 'Prisoner', health: 10, attack: 2, behavior: 'aggressive' },
      { name: 'Guard', health: 20, attack: 4, behavior: 'patrolling' }
    ]
  },
  storeroom: {
    color: '#dcd4b0',
    monsters: [
      { name: 'Mimic', health: 25, attack: 5, behavior: 'aggressive' },
      { name: 'Rat', health: 5, attack: 1, behavior: 'passive' }
    ]
  },
  'Indoor Jungle': {
    color: '#00ff00',
    monsters: [
      { name: 'Snake', health: 10, attack: 3, behavior: 'aggressive' },
      { name: 'Spider', health: 8, attack: 2, behavior: 'aggressive' }
    ]
  },
  default: {
    color: '#e8e8e8',
    monsters: [
      { name: 'Goblin', health: 10, attack: 2, behavior: 'aggressive' },
      { name: 'Skeleton', health: 15, attack: 3, behavior: 'patrolling' },
      { name: 'Orc', health: 25, attack: 5, behavior: 'aggressive' },
      { name: 'Rat', health: 5, attack: 1, behavior: 'passive' }
    ]
  }
};