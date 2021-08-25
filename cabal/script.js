let season = require('./season21.json');


class Season {
    _season
    r
    g
    constructor(s) {
        this._season = s;
        this.r = this._season.rounds
        this.g = this.getGames(this.r).sort((a, b) => b[1] - a[1])
    }

    getGames(r) {
        let allgames = [];
        r.forEach(e => {
            e.forEach(g => {
                let game =  this.parse(g)
                game[1] = new Date(game[1])
                allgames.push(  game )
            }); 
        });
        return allgames
    }

    parse(str) {
        return str.split(',')
    }

    getDate(d) {
        let date = new Date(d)
        return ((date.getMonth() > 8) ? (date.getMonth() + 1) : ('0' + (date.getMonth() + 1))) + '/' + ((date.getDate() > 9) ? date.getDate() : ('0' + date.getDate())) + '/' + date.getFullYear() 
    }

    d() {
        let str = this.r[0]
        console.log(str)
        let arr = this.parse(str)
        console.log(arr)
        
        console.log(date)
        console.log( this.getDate(date) )
    }
}

let s = new Season(season)

console.log( s.g)