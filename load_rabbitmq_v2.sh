#!/bin/bash
#
# This script loads RabbitMQ in the UserGlobals in a GsDevKit_stones environment
#
#
usage() {
  cat <<HELP

USAGE: $(basename $0) <stoneName> <registryName> [stonesDataHome]

HELP
}

if [ $# -lt 2 ]; then
  usage; exit 1
fi

CURRENTDIR=`pwd`

# Assign parameters
stoneName=$1
registryName=$2
stonesDataHome=${3:-$STONES_DATA_HOME}

# Extract the value of 'stone_dir' from the .ston file
stone_dir=$(pas_datadir.sh $stoneName $registryName $stonesDataHome)

# Check the return code of the script
if [[ $? -eq 0 ]]; then
    echo "The script executed successfully."
else
    echo "The script failed with return code $?."
fi

# Check if stone_dir was found
if [[ -z "$stone_dir" ]]; then
    echo "Error: 'stone_dir' not found in $ston_file_path"
    exit 1
fi

source $stone_dir/customenv

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

cat << EOF | $GEMSTONE/bin/topaz -T 4000000 -l -u loadrabbitmq  2>&1 >> $CURRENTDIR/loadRabbitMQ_${nowTS}.log
set user SystemUser pass $GEMSTONE_CONFIG_PASS gems $stoneName
display oops
iferror where

login

input install.topaz
input install.tests.topaz

output pop
exit

%
EOF

