console.log("Worker is running");
onconnect = function (event) {
    console.log("Worker is running");
    const port = event.ports[0];
  
    port.onmessage = function (e) {
        console.log("Worker is running");
      const workerResult = `Result: ${e.data[0] * e.data[1]}`;
      port.postMessage(workerResult);
    };
  };
