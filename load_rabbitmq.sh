#!/bin/bash
#
# This script loads PostgreSQL in the UserGlobals
#
#
usage() {
  cat <<HELP

USAGE: $(basename $0) <db-name>


EAXMPLES
  $(basename $0) stonename

HELP
}

if [ $# -ne 1 ]; then
  usage; exit 1
fi

CURRENTDIR=`pwd`

#
# In einer CROM-Umgebung ist zumindestens der $HOME gesetzt
#
cd $HOME
if [ ! -d "GsDevKit_home" ]; then
   echo "Es gibt kein GsDevKit_home Verzeichnis"
   exit 1
fi
cd GsDevKit_home
export GS_HOME=`pwd`
export PATH=$GS_HOME/bin:$PATH

source $GS_HOME/bin/defGsDevKit.env
source $GS_HOME/server/stones/$1/defStone.env $1
if [ -s $GEMSTONE/seaside/etc/gemstone.secret ]; then
    . $GEMSTONE/seaside/etc/gemstone.secret
else
    echo 'Missing password file $GEMSTONE/seaside/etc/gemstone.secret'
    exit 1
fi
nowTS=`date +%Y-%m-%d-%H-%M`

export RABBITMQ_LIB=/usr/lib/x86_64-linux-gnu/librabbitmq.so.4

cd $CURRENTDIR
cd src

cat << EOF | $GEMSTONE/bin/topaz -T 4000000 -l -u loadpostgresql  2>&1 >> $CURRENTDIR/loadPostgreSQL_${nowTS}.log
set user SystemUser pass $GEMSTONE_CONFIG_PASS gems $GEMSTONE_NAME
display oops
iferror where

login

input install.topaz
input install.tests.topaz

output pop
exit

%
EOF

