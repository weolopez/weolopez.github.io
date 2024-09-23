export class EventHandlers {
  constructor(canvas, map, game, ui) {
    this.canvas = canvas;
    this.map = map;
    this.game = game;
    this.ui = ui;

    // For panning
    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;

    // For zooming
    this.zoomSensitivity = 0.001;
  }

  init() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
  }

  handleMouseDown(event) {
    this.isDragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
  }

  handleMouseUp(event) {
    this.isDragging = false;
  }

  handleMouseMove(event) {
    if (this.isDragging) {
      const dx = event.clientX - this.lastX;
      const dy = event.clientY - this.lastY;
      this.lastX = event.clientX;
      this.lastY = event.clientY;

      this.map.offsetX += dx;
      this.map.offsetY += dy;

      this.map.render();
    }
  }

  handleWheel(event) {
    event.preventDefault();

    const delta = event.deltaY * this.zoomSensitivity;
    const scaleFactor = 1 - delta;

    // Get mouse position relative to the canvas
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Adjust the offset to zoom towards the mouse pointer
    this.map.offsetX = mouseX - scaleFactor * (mouseX - this.map.offsetX);
    this.map.offsetY = mouseY - scaleFactor * (mouseY - this.map.offsetY);

    // Apply scale
    this.map.scale *= scaleFactor;

    // Render the map
    this.map.render();
  }

  handleClick(event) {
    const { offsetX: x, offsetY: y } = event;
    const territory = this.map.getTerritoryAtPoint(x, y);

    if (territory) {
      this.map.zoomToTerritory(territory);
    }
  }
}

