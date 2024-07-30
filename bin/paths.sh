#export JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk1.8.0_221.jdk/Contents/Home
#export GRAALVM_HOME="/Library/Java/JavaVirtualMachines/graalvm-ce-19.2.1/Contents/Home"
#export RUST_HOME=~/.cargo/bin/rustc
#export CODEREADY=~/Applications/crwctl
#export PATH=$RUST_HOME:$PATH
#export PATH="/Users/lopemaurus.ibm.com/.crc/bin:$PATH"
#export PATH=${GRAALVM_HOME}/bin:$PATH
#export PATH=${CODEREADY}/bin:$PATH
#export PATH="/Users/lopemaurus.ibm.com/.crc/bin/oc:$PATH"
#export WINEARCH="win64" 
#export WINEPREFIX="$HOME/.wine64" 
# export PATH=$PATH:~/Applications/Oracle/basic

# export JAVA_8_HOME=$(/usr/libexec/java_home -v1.8)
# export JAVA_11_HOME=$(/usr/libexec/java_home -v11)
#export JAVA_15_HOME=$(/usr/libexec/java_home -v15)
# alias java8='export JAVA_HOME=$JAVA_8_HOME'
# alias java11='export JAVA_HOME=$JAVA_11_HOME'
#alias java15='export JAVA_HOME=$JAVA_15_HOME'
# default to Java 15
# java11

#if type brew &>/dev/null; then
#  FPATH=$(brew --prefix)/share/zsh/site-functions:$FPATH
#
#  autoload -Uz compinit
#  compinit
#fi


###### START ######
set -o vi
export ATTID=ml5174
export ATTPWD=
export no_proxy=localhost,127.0.0.1

export OLLAMA_ORIGINS="*"
#export OLLAMA_HOST=0.0.0.0
#export PATH="/opt/homebrew/anaconda3/bin:$PATH"


export HOME=/Users/ml5174
export NVM_DIR="$HOME/.nvm"

export EDITOR=vi
export PATH=~/bin:$PATH:"/opt/homebrew/bin"
#export PATH=$PATH:"~/miniconda3/bin"
export PATH=/opt/homebrew/opt/python@3.12/libexec/bin:$PATH
export PATH=$PATH:~/Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin
#export PATH=/Users/ml5174/.local/bin/poetry:$PATH


[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && \. "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion
