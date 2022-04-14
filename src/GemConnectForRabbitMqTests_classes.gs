fileformat utf8
set compile_env: 0
! ------------------- Class definition for GsAmqpConnectionTestCase
expectvalue /Class
doit
GsTestCase subclass: 'GsAmqpConnectionTestCase'
  instVarNames: #()
  classVars: #( hostname loginTimeMs password port userId)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpTlsConnectionTestCase
expectvalue /Class
doit
GsAmqpConnectionTestCase subclass: 'GsAmqpTlsConnectionTestCase'
  instVarNames: #()
  classVars: #( caCertPath certPath privateKey verifyHostname verifyPeer)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpBasicPropertiesTestCase
expectvalue /Class
doit
GsTestCase subclass: 'GsAmqpBasicPropertiesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpBytesTestCase
expectvalue /Class
doit
GsTestCase subclass: 'GsAmqpBytesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
