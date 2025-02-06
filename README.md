# weolopez.github.io
it worked again

Lets start with the lightweight api then we can design the robust api to support it after.    I'll start by defining the JSON example and how the new api will support crud operations:


Here's the full JSON structure for both Users and Orders based on your previous specifications:

Users JSON:
json
[
  {
    "id": 1,
    "Name": "JohnDoe",
    "Email": "john@doe.com",
    "parentID": "",
    "parentType": "",
    "Orders": [
      {"id": 101},
      {"id": 102}
    ]
  }
]

Orders JSON:
json
[
  {
    "id": 101,
    "OrderName": "Order 1",
    "Product": "Widget",
    "parentID": "1",
    "parentType": "Users"
  },
  {
    "id": 102,
    "OrderName": "Order 2",
    "Product": "Gadget",
    "parentID": "1",
    "parentType": "Users"
  }
]

Explanation:
Users JSON:
Contains an array of user objects, each with id, Name, Email, parentID, parentType, and an Orders array where each order is referenced by its ID.
parentID and parentType are empty for users as they are top-level entities here.
Orders JSON:
Contains an array of order objects, each with full details including id, OrderName, Product, parentID, and parentType.
parentID refers back to the user's id in the Users JSON, linking each order to its owner.
parentType clarifies that the parent entity is of type "Users".

API should operate maximally on the objects
const db = new DB("MyDatabase", ["Users", "Orders"])
const newUser = db.Users.add({
    "Name": "JohnDoe",
    "Email": "john@doe.com"
    }) //add operation adds id,parentID='', parentType='' as it is top level
newUser.Email = "johndoe@domain.com" //updates the database
const newOrder = db.Orders.add({
    "SKU": "SKUNUMBER",
    "ADDRESS": "SOMEADDRESS"
}, newUser) // add operation adds id, parentID=newUser.id, parentType="Users" and adds newOrder.id to newUser.Orders array
newOrder.remove() //deletes the Order and removes newOrder.id from newUser.Orders array

const existingUser = db.Users.find({
    "Name": "JohnDoe"
})
const existingOrder = existingUser.find({
    "Orders": Orders[0]
    })

