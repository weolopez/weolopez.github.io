
	let tableOfContent = document.querySelector('#tableOfContent');
	let chapter = document.querySelector('#chapter');
	let left = document.querySelector('#left');
	let chapters = '';

	Object.keys(RESUME).forEach( key => {
		let chapterContent = `
				<li id="chapter">
					<p>${key}</p>
				</li>
				`;
        chapters += chapterContent;
	})
    tableOfContent.innerHTML = chapters;