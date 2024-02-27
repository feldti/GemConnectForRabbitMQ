fileformat utf8
set compile_env: 0
! ------------------- Class definition for GsAmqpAbstractTestCase
expectvalue /Class
doit
GsTestCase subclass: 'GsAmqpAbstractTestCase'
  instVarNames: #()
  classVars: #( tlsTestsEnabled)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpBasicPropertiesTestCase
expectvalue /Class
doit
GsAmqpAbstractTestCase subclass: 'GsAmqpBasicPropertiesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpBytesTestCase
expectvalue /Class
doit
GsAmqpAbstractTestCase subclass: 'GsAmqpBytesTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpConnectionTestCase
expectvalue /Class
doit
GsAmqpAbstractTestCase subclass: 'GsAmqpConnectionTestCase'
  instVarNames: #()
  classVars: #( amqpUserId hostname loginTimeMs password port vhost)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpExampleTestCase
expectvalue /Class
doit
GsAmqpAbstractTestCase subclass: 'GsAmqpExampleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpFieldValueTestCase
expectvalue /Class
doit
GsAmqpAbstractTestCase subclass: 'GsAmqpFieldValueTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpTableEntryArrayTestCase
expectvalue /Class
doit
GsAmqpAbstractTestCase subclass: 'GsAmqpTableEntryArrayTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpTableEntryTestCase
expectvalue /Class
doit
GsAmqpAbstractTestCase subclass: 'GsAmqpTableEntryTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpTableTestCase
expectvalue /Class
doit
GsAmqpAbstractTestCase subclass: 'GsAmqpTableTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpTlsConnectionTestCase
expectvalue /Class
doit
GsAmqpConnectionTestCase subclass: 'GsAmqpTlsConnectionTestCase'
  instVarNames: #()
  classVars: #( caCertPath certPath privateKey privateKeyPassphrase verifyHostname verifyPeer)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
! ------------------- Class definition for GsAmqpTlsExampleTestCase
expectvalue /Class
doit
GsAmqpExampleTestCase subclass: 'GsAmqpTlsExampleTestCase'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMqTests
  options: #()

%
