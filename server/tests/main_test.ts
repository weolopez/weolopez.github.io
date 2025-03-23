import { assertEquals } from "@std/assert";
import { serve } from "https://deno.land/std@0.172.0/http/server.ts";
import { handler } from "../src/main.ts";

Deno.test("server startup", async () => {
  // Mock environment variables if needed for the test
  Deno.env.set("TOKEN", "test_token");

  let serverStarted = false;
  const port = 8081; // Use a different port for testing

  // Create an AbortController to allow shutting down the server
  const controller = new AbortController();

  // Start the server with an AbortSignal so it can be stopped
  const serverPromise = serve(handler, { port, signal: controller.signal });

  // Wait for a short moment to allow the server to start
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Check if the server is running (basic check, more robust checks can be added)
  try {
    const response = await fetch("http://localhost:" + port + "/v1/responses");
    if (response.status !== 405) { // Expecting "Method Not Allowed" as we are not POSTing
      throw new Error("Server did not respond as expected: Status " + response.status);
    }
    serverStarted = true;
  } catch (error) {
    console.error("Server startup test error:", error);
    serverStarted = false;
  } finally {
    // Stop the server by aborting the signal
    controller.abort();
    // Race a timeout to ensure the test doesn't hang if serverPromise takes too long to settle
    await Promise.race([
      serverPromise.catch(() => {}), 
      new Promise((resolve) => setTimeout(resolve, 200))
    ]);
  }

  assertEquals(serverStarted, true, "Server should start successfully");

  // Cleanup environment variables after the test
  Deno.env.delete("TOKEN");
});