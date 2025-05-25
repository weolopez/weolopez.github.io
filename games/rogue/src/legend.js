  // The color scheme from your themeColors object
import { themeColors } from './utils/data.js';

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
    { label: 'Indoor Jungle',        color: themeColors['Indoor Jungle'] }
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