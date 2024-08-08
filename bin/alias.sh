export SHARED_BOX="~/Box/Shared\ with\ Mauricio"
alias wiki='cd "/Users/ml5174/Development/python/wiki";workon wiki;python run.py'
alias help='alias'
alias pgrep=`pgrep -l $2`
alias olly='export OLLAMA_ORIGINS=*;ollama serve & ollama run llama3.1'
alias ssht='ssh attcloud@135.170.32.220 -p 8147'
alias rflask='cd ~/Development/sample_flask/ ; export FLASK_APP=app.py ; export FLASK_ENV=development ; flask run --host=0.0.0.0'
alias net="curl ipinfo.io"
alias recent="history | awk '{print $2}' | sort | uniq -c | sort -rn | head"
alias proxy="curl http://autoproxy.sbc.com/sub.pac"

alias vi="~/Applications/nvim-macos/bin/nvim"
alias ls='ls -G'
alias l='ls -lastrG'
alias cds="cd $SHARED_BOX"
alias cdc="cd ~/Development/codecloud"
alias cdb="cd ~/Development/github/jbang-examples"
alias cdr="cd ~/Development/github/weolopez.github.io"

alias did="$EDITOR +'normal Go' +'r!date' ~/did.txt"
alias size="du -sh"
alias ea="$EDITOR ~/bin/alias.sh"
alias ef="$EDITOR ~/bin/functions.sh"
alias es="$EDITOR ~/bin/snipit"
alias ep="$EDITOR ~/bin/paths.sh"
alias ez="$EDITOR ~/bin/.zshrc"

alias x="arch -x86_64 zsh"
alias a="arch -xarm64 zsh"

alias k=kubectl

alias p3="python3"
alias pip="pip3"
alias mongos="brew services start mongodb-community"
#mongod --dbpath ~/Applications/mongo/db/data"
alias mongobd="mongodump --host"
alias mymongo="mongosh "mongodb+srv://freecluster.f3g4q6l.mongodb.net/" --apiVersion 1 --username weolopez"


alias firebaseD=firebase deploy --only hosting

alias buildD="docker build -t dmp-image .;docker run --name dmp-image -d -p 8080:8080 -p 1880:1880 dmp-image"
alias buildP="mvn -o clean install -DskipTests"
alias buildQ="mvn clean quarkus:dev" 
alias debugQ="mvn clean quarkus:dev -Ddebug" 
alias buildN="mvn package -Pnative -Dquarkus.native.container-runtime=docker"

alias runea="docker-wine wine .wine/drive_c/users/wineuser/ea/EA.exe"
alias killp="lsof -i tcp:$1 | awk 'NR!=1 {print $2}' | xargs kill -9"

