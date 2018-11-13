# Nagios plugins for EOS blockchain

## Installation

```
## Install Icinga according to the OS version
cat >>/etc/apt/source.list <<'EOT'
deb http://packages.icinga.org/ubuntu icinga-bionic main
EOT

curl -sSL https://packages.icinga.com/icinga.key | sudo apt-key add -
apt update && apt install -y icinga2 nagios-plugins-contrib;


apt install -y git libdatetime-format-iso8601-perl libjson-xs-perl libjson-perl libwww-perl

git clone https://github.com/cc32d9/eos-nagios-plugins.git /opt/eos-nagios-plugins


ln -s /opt/eos-nagios-plugins/check_nodeos_block_time /usr/lib/nagios/plugins/
ln -s /opt/eos-nagios-plugins/check_nodeos_db_size /usr/lib/nagios/plugins/
```


## Usage

Check how much nodeos is delaying behind current time:

```
/usr/lib/nagios/plugins/check_nodeos_block_time --url=http://api.eostribe.io
BLOCKTIME OK - 0.440752s difference|time_diff=0.440752
```

Check nodeos shared memory usage:

```
/usr/lib/nagios/plugins/check_nodeos_db_size --url=http://127.0.0.1:8888
EOS_DB OK - 8.86% used|percent_used=8.86 bytes_used=3042721344
```






## Copyright and License

Copyright 2018 cc32d9@gmail.com

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
