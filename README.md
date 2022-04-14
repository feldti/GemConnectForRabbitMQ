# GemConnectForRabbitMQ (GCFRMQ)
Connect GemStone/64 to RabbitMQ via FFI to librabbitmq

## Prerequisites
1. GemStone/64 version 3.6.4 or later.
2. librabbitmq client library installed (librabbitmq4 package)

## Installation

1. Find the RabbitMQ client shared library on your system. The file name is usually librabbitmq.so.4 so and it should be in /usr/lib or /usr/local/lib.

2. Set the envirnoment variable RABBITMQ_LIB to reference the ***full path*** to the RabbitMQ shared library (this is only needed during installation. Once initialized, GCFRMQ remembers where this library is located).
```
export RABBITMQ_LIB=/usr/lib/librabbitmq.so.4
```

3. cd to the src directory
```
cd src
```
4. Login to topaz GemStone as SystemUser
```
 ________________________________________________________________________________
|              GemStone/S64 Object-Oriented Data Management System               |
|                    Copyright (C) GemTalk Systems 1986-2022                     |
|                              All rights reserved.                              |
|                            Covered by U.S Patents:                             |
|        6,256,637 Transactional virtual machine architecture (1998-2018)        |
|          6,360,219 Object queues with concurrent updating (1998-2018)          |
|              6,567,905 Generational Garbage Collector (2001-2021)              |
|     6,681,226 Selective Pessimistic Locking for a Concurrently Updateable      |
|                              Database (2001-2021)                              |
+--------------------------------------------------------------------------------+
|    PROGRAM: topaz, Linear GemStone Interface (Linked Session)                  |
|    VERSION: 3.6.4, Fri Mar 18 13:37:47 2022 normg private build (branch 3.6.4) |
|     COMMIT: 2022-03-18T13:23:23-07:00 5e6523f43f3213ec68e9821fe5b8f9ff42c90d85 |
|  BUILT FOR: x86-64 (Linux)                                                     |
| RUNNING ON: 8-CPU moop x86_64 (Linux 4.15.0-147-generic #151-Ubuntu SMP Fri Jun|
| 18 19:21:19 UTC 2021)                                                          |
|  PROCESSOR: 4-core Intel(R) Core(TM) i7-7700K CPU @ 4.20GHz (Kaby Lake-DT)     |
|     MEMORY: 64287 MB                                                           |
| PROCESS ID: 20675     DATE: 04/13/22 17:16:09 PDT  (UTC -7:00)                 |
|   USER IDS: REAL=normg (300) EFFECTIVE=normg (300) LOGIN=normg (300)           |
| BUILD TYPE: SLOW                                                               |
+--------------------------------------------------------------------------------+
|________________________________________________________________________________|
Warning, executable configuration file not found
    /moop3/users/normg/gcfrmq/src/gem.conf

Reading initialization file /home/normg/.topazini
topaz> login
[Info]: LNK client/gem GCI levels = 36200/36200
ShrPcClientConnect got newClientId 9 newSlot 10
--- 04/13/22 17:16:10.826 PDT Login
[Info]: User ID: SystemUser
[Info]: Repository: norm
[Info]: Session ID: 5 login at 04/13/22 17:16:10.829 PDT
[Info]: GCI Client Host: 
[Info]: Page server PID: -1
[Info]: using libicu version 58.2
[Info]: Loaded /export/moop3/users/normg/gs364/slow50/gs/product/lib/libicu.58.2.so
[Info]: Gave this process preference for OOM killer: wrote to /proc/20675/oom_score_adj value 250
[04/13/22 17:16:10.832 PDT]
  gci login: currSession 1  linked session 
successful login
topaz 1>
```

5. Install the code.
Classes will be placed in a SymbolListDictionary called GemConnectForRabbitMq
Output goes to a file named GemConnectForRabbitMq.install.log
```
  topaz>input install.topaz
```
If all goes well you will see an errorcout of 0 like this:
```
Successful commit
topaz 1 +> errorcount
0
topaz 1 +> output pop
```

6. Optional: Install the Unit Tests
Classes will be placed in a SymbolListDictionary called GemConnectForRabbitMqTests
Output goes to a file named GemConnectForRabbitMqTests.install.log
```
  topaz>input install.tests.topaz
```

## Using GCFRMQ
Looks the class GsAmqpExample. There are many examples in class methods for both producers
and consumers.


