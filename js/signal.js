/**
 * Creates a reactive object from a plain JavaScript object.
 * This implementation uses the Proxy API to intercept property access
 * and mutations, allowing for fine-grained reactivity.
 *
 * @param {object} target - The initial object to make reactive.
 * @returns {Proxy} A reactive proxy of the target object.
 */
function createReactive(target) {
  // A map to store subscribers.
  // The key is the property name, and the value is a Set of callback functions.
  // Example: 'name' => Set[callback1, callback2]
  const subscribers = new Map();

  // The handler for the Proxy, which defines the custom behavior (traps).
  const handler = {
    /**
     * The 'get' trap is triggered when a property is accessed.
     */
    get(obj, prop, receiver) {
      // We are creating a special 'subscribe' method on our reactive object.
      // This is a clean way to provide the subscription API without polluting the target object.
      if (prop === 'subscribe') {
        return (property, callback) => {
          // If there's no entry for this property, create one.
          if (!subscribers.has(property)) {
            subscribers.set(property, new Set());
          }
          // Add the callback to the set of subscribers for this property.
          subscribers.get(property).add(callback);

          // Return an 'unsubscribe' function for cleanup.
          return () => {
            subscribers.get(property)?.delete(callback);
          };
        };
      }

      // For any other property, just return its value from the original object.
      // Reflect.get ensures the correct 'this' context is maintained.
      return Reflect.get(obj, prop, receiver);
    },

    /**
     * The 'set' trap is triggered when a property value is changed.
     */
    set(obj, prop, value, receiver) {
      // Get the old value for comparison.
      const oldValue = obj[prop];

      // Only proceed if the new value is different from the old one.
      // This prevents unnecessary notifications.
      if (oldValue !== value) {
        // Perform the actual update on the target object.
        const success = Reflect.set(obj, prop, value, receiver);

        // If the update was successful and there are subscribers for this property...
        if (success && subscribers.has(prop)) {
          // ...notify every subscriber by calling their callback with the new value.
          subscribers.get(prop).forEach(callback => callback(value));
        }
        return success;
      }
      return true; // Indicate success even if no change occurred.
    },
  };

  // Create and return the Proxy. It looks and feels like a normal object,
  // but its 'get' and 'set' operations are now intercepted by our handler.
  return new Proxy(target, handler);
}


// --- Example Usage ---

console.log("--- Creating a reactive user object ---");
const user = createReactive({
  name: 'Alice',
  age: 30,
  isLoggedIn: false,
});

console.log("--- Subscribing to property changes ---");

// Subscribe to changes on the 'name' property
const unsubscribeName = user.subscribe('name', (newName) => {
  console.log(`User's name changed to: ${newName}`);
  document.getElementById('nameDisplay').textContent = `Name: ${newName}`;
});

// Subscribe to changes on the 'age' property
const unsubscribeAge = user.subscribe('age', (newAge) => {
  console.log(`User's age is now: ${newAge}`);
   document.getElementById('ageDisplay').textContent = `Age: ${newAge}`;
});

// A second subscriber for the 'age' property
const unsubscribeAgeAnnouncer = user.subscribe('age', (newAge) => {
  console.log(`ANNOUNCEMENT: The user is now ${newAge} years old!`);
});


console.log("\n--- Triggering updates ---");

// These assignments will now trigger the corresponding subscribers.
user.name = 'Bob'; // Triggers the name subscriber
user.age = 31;     // Triggers both age subscribers
user.name = 'Charlie'; // Triggers the name subscriber again

console.log("\n--- An update with no change ---");
user.age = 31; // No logs, because the value didn't change.


console.log("\n--- Unsubscribing from name changes ---");
unsubscribeName();

// This change will no longer be logged because we unsubscribed.
user.name = 'David';
console.log("Name was changed to David, but no subscriber was called.");
console.log(`Current name is: ${user.name}`);

// The age subscriber is still active.
user.age = 32;

// Simple HTML to see the results on a page
document.body.innerHTML += `
  <div style="font-family: sans-serif; padding: 20px;">
    <h2>Reactive User Info</h2>
    <p id="nameDisplay">Name: Alice</p>
    <p id="ageDisplay">Age: 30</p>
  </div>
`;

