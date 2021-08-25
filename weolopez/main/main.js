	let main = '';
    
	Object.keys(RESUME).forEach( key => {
		let chapterContent = `
<p>${RESUME[key]}</p>
		`;
        main += chapterContent;
    })
    
    document.querySelector('#main').innerText = main;
    JSON.stringify(RESUME);