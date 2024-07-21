function tell {
	first_arg="$1"
	shift
        echo "$@" > $first_arg
}

function popup {
	#osascript -e 'tell app "System Events" to display dialog "'"$1"'"'
	osascript -e -e 'display alert "Alert" message "'"$1"'" ' 
}

function speak {
        kill $oldpid 2>/dev/null

        tail -fn0 $me | \
        while read line ; do
                if [ $? = 0 ]
                then
                        #say $line 
			popup $line
                fi
        done
}
function t {
	export http_proxy="http://$ATTID:$ATTPWD@sub.proxy.att.com:8888/"
	#export http_proxy='http://sub.proxy.att.com:8888/'
	export ALL_PROXY=$http_proxy
	export https_proxy=$http_proxy
        cp ~/.config/pip/pip.conf_t ~/.config/pip/pip.conf
        cp ~/.npmrc_t ~/.npmrc
}
function home {
        unset http_proxy
        unset https_proxy
	unset ALL_PROXY
        cp ~/.npmrc_home ~/.npmrc
        cp ~/.config/pip/pip.conf_home ~/.config/pip/pip.conf
        rm ~/.m2/settings.xml
}
function azproxy {
    export {http,https,ftp}_proxy="http://proxy.conexus.svc.local:3128"
    export {HTTP,HTTPS,FTP}_PROXY="http://proxy.conexus.svc.local:3128"
}
unsetproxy () 
    unset {http,https,ftp}_proxy;
function pepsi {
        cp ~/.npmrc_pepsi ~/.npmrc
        cp ~/.m2/settings.xml.pepsico ~/.m2/settings.xml
}
function weo {
        cp ~/.npmrc_weo ~/.npmrc
}

oldpid=`cat ~/.pid`
#speak 1>/dev/null&
echo $! > ~/.pid

