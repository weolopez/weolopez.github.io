cat /etc/systemd/system/http-server.service
[Unit]
Description=HTTP Server
After=network.target

[Service]
Type=simple
User=root
Environment="TOKEN=weotek"  # Add this line to set the TOKEN environment variable
WorkingDirectory=/root/weolopez.github.io
ExecStart=/root/.deno/bin/deno task dev  # <--- Use the absolute path here
Environment="TOKEN=weotek"  # Add this line to set the TOKEN environment variable
Environment=""
#export sk108852982608476257338=""
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target

[gitlab]
Configure /etc/gitlab/gitlab.rb (external_url, etc.) → sudo gitlab-ctl reconfigure.

systemctl restart http-server.service
