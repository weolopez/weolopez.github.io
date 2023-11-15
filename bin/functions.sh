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
	export http_proxy='http://ml5174:LoReS%211939@sub.proxy.att.com:8888/'
	export ALL_PROXY=$http_proxy
	export https_proxy=$http_proxy
}
function home {
        unset http_proxy
        unset https_proxy
        cp ~/.npmrc_home ~/.npmrc
        rm ~/.m2/settings.xml
}
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

