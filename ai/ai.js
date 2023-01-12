import {Collection} from 'https://cabalbot.azurewebsites.net/ai/collection/collection.js'

let collection = new Collection('test', (data) => {
    console.log(data)
})