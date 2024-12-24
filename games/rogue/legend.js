  // The color scheme from your themeColors object
  const themeColors = {
    library: '#d4c99d',
    armory: '#c9d4a3',
    'dining hall': '#d4b0b0',
    prison: '#bcc2d4',
    storeroom: '#dcd4b0',
    defaultCorridor: '#e8e8e8',
    door: '#663300',
    wall: '#333333',
    garden: '#00ff00'
  };

  // Simple labels to show in the legend
  const legendItems = [
    { label: 'Library',     color: themeColors.library },
    { label: 'Armory',      color: themeColors.armory },
    { label: 'Dining Hall', color: themeColors['dining hall'] },
    { label: 'Prison',      color: themeColors.prison },
    { label: 'Storeroom',   color: themeColors.storeroom },
    { label: 'Corridor',    color: themeColors.defaultCorridor },
    { label: 'Door',        color: themeColors.door },
    { label: 'Wall',        color: themeColors.wall },
    { label: 'Indoor Jungle',        color: themeColors.garden }
  ];

  // Populate the legend
  const legendList = document.getElementById('legend-list');
  legendItems.forEach(item => {
    const li = document.createElement('li');

    // Swatch
    const swatch = document.createElement('div');
    swatch.className = 'swatch';
    swatch.style.backgroundColor = item.color;

    // Label text
    const textNode = document.createTextNode(item.label);

    li.appendChild(swatch);
    li.appendChild(textNode);
    legendList.appendChild(li);
  });

  // Toggle legend visibility
  const legendButton = document.getElementById('legend-button');
  const legendDiv = document.getElementById('legend');

  legendButton.addEventListener('click', () => {
    if (legendDiv.style.display === 'none') {
      legendDiv.style.display = 'block';
      legendButton.textContent = 'Hide Legend';
    } else {
      legendDiv.style.display = 'none';
      legendButton.textContent = 'Show Legend';
    }
  });