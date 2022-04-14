fileformat utf8
! ------------------- Remove existing behavior from GsAmqpConnectionTestCase
removeAllMethods GsAmqpConnectionTestCase
removeAllClassMethods GsAmqpConnectionTestCase
! ------------------- Class methods for GsAmqpConnectionTestCase
category: 'Accessing'
classmethod: GsAmqpConnectionTestCase
hostname

^ hostname ifNil: ['localhost' ] ifNotNil:[ hostname]
%
category: 'Updating'
classmethod: GsAmqpConnectionTestCase
hostname: newValue

hostname := newValue

%
category: 'Accessing'
classmethod: GsAmqpConnectionTestCase
loginTimeMs

^ loginTimeMs ifNil:[ 3000 ] ifNotNil:[ loginTimeMs ]
%
category: 'Updating'
classmethod: GsAmqpConnectionTestCase
loginTimeMs: newValue

loginTimeMs := newValue
%
category: 'Credentials'
classmethod: GsAmqpConnectionTestCase
loginTimeoutMs


^ 50000 "milliseconds = 5 seconds"
%
category: 'Connections'
classmethod: GsAmqpConnectionTestCase
newConnection

	^(GsAmqpConnection newOnHost: self hostname port: self port)
		loginWithUserId: self userId
		password: self password
		timeoutMs: self loginTimeoutMs
%
category: 'Connections'
classmethod: GsAmqpConnectionTestCase
newPreConnectConnection

"Create a connection and connect to the broker but do not connect or login."

	^(GsAmqpConnection newOnHost: self hostname port: self port)
		setSocketOptions
%
category: 'Connections'
classmethod: GsAmqpConnectionTestCase
newPreLoginConnection

"Create a connection and connect to the broker but do not login. Used to test login credentials."

	^ self newPreConnectConnection _connectWithTimeoutMs: self loginTimeoutMs
%
category: 'Accessing'
classmethod: GsAmqpConnectionTestCase
password

^ password
%
category: 'Updating'
classmethod: GsAmqpConnectionTestCase
password: newValue

password := newValue
%
category: 'Accessing'
classmethod: GsAmqpConnectionTestCase
port

^ port ifNil:[ self targetClass defaultPort ] ifNotNil:[ port ]
%
category: 'Updating'
classmethod: GsAmqpConnectionTestCase
port: newValue

port := newValue
%
category: 'Subclass methods'
classmethod: GsAmqpConnectionTestCase
targetClass

^ GsAmqpConnection
%
category: 'Accessing'
classmethod: GsAmqpConnectionTestCase
userId

^ userId
%
category: 'Updating'
classmethod: GsAmqpConnectionTestCase
userId: newValue

userId := newValue
%
! ------------------- Instance methods for GsAmqpConnectionTestCase
category: 'Accessing'
method: GsAmqpConnectionTestCase
badPassword

^ self class password, 'Bogus'
%
category: 'Accessing'
method: GsAmqpConnectionTestCase
hostname

^ self class hostname
%
category: 'Accessing'
method: GsAmqpConnectionTestCase
loginTimeMs

^ self class loginTimeMs
%
category: 'Accessing'
method: GsAmqpConnectionTestCase
password

^ self class password
%
category: 'Accessing'
method: GsAmqpConnectionTestCase
port

^ self class port
%
category: 'subclass methods'
method: GsAmqpConnectionTestCase
targetClass

^ GsAmqpConnection
%
category: 'Tests'
method: GsAmqpConnectionTestCase
testCloseConnection

| cons |
cons := Array new.

[
self should:[(cons add: self class newPreConnectConnection) _closeConnection] raise: 2713 ; "close connection not open"
	should:[ self class newConnection closeConnection _closeConnection] raise: 2713 ; "close already closed connection"
	should:[ self class newConnection closeConnection _destroyConnection] raise: 2713 ; "destroy already destroyed connection"
	should:[ self class newConnection closeConnection closeConnection] raise: 2713  "close already destroyed connection"
] ensure:[ cons do:[:e| e _destroyConnection ] ].
^ self
%
category: 'Tests'
method: GsAmqpConnectionTestCase
testConnection

| cons |
cons := Array new.

[
self should:[(cons add: (self targetClass newOnHost: 'bogus')) _connectWithTimeoutMs: 1000] raise: 2713 ; "invalid hostname"
	should:[(cons add: (self targetClass newOnHost: self class hostname port: 1000000)) _connectWithTimeoutMs: 1000] raise: 2713 ; "invalid port"
	should:[(cons add: (self targetClass newOnHost: self class hostname)) _connectWithTimeoutMs: true] raise: 2094 ; "Invalid timeout arg"
	should:[(cons add: (self targetClass newOnHost: self class hostname port: 65530)) _connectWithTimeoutMs: 1000] raise: 2713 ;  "invalid port"
	should:[(cons add: (self targetClass newOnHost: self class hostname port: true)) _connectWithTimeoutMs: 1000] raise: ArgumentError  "invalid port"
] ensure:[ cons do:[:e| e _destroyConnection ] ].
^ self
%
category: 'Tests'
method: GsAmqpConnectionTestCase
testCreateNewConnection

| conn cls |
cls := self targetClass.
[
conn := cls newOnHost: self hostname port: self port .
self _testNewConnection: conn.
conn := cls newOnHost: self hostname.
self _testNewConnection: conn.
conn := nil.
] ensure:[ conn ifNotNil:[ conn _destroyConnection] ].

^ self
%
category: 'Tests'
method: GsAmqpConnectionTestCase
testLoginCredentials

| cons tmp |
cons := Array new.

[
self assert: (cons add: (tmp := self class newConnection)) class identical: self targetClass ;
 	should:[(cons add: (self class newPreLoginConnection)) _loginWithUserId: 'bogus' password: 'bogus2'] raise: 2713 ; "invalid uid and password"
	should:[(cons add: (self class newPreLoginConnection)) _loginWithUserId: true password: 'bogus2'] raise: ArgumentError ; "invalid uid and password"
	should:[(cons add: (self class newPreLoginConnection)) _loginWithUserId: self class userId password: false ] raise: ArgumentError ; "invalid uid and password"
	should:[(cons add: (self class newPreLoginConnection)) _loginWithUserId: self class userId password: 'bogus2'] raise: 2713  "invalid password"
] ensure:[ cons do:[:e| e _destroyConnection ] ].
^ self
%
category: 'Accessing'
method: GsAmqpConnectionTestCase
userId

^ self class userId
%
category: 'Tests'
method: GsAmqpConnectionTestCase
_testNewConnection: conn

^self assert: conn class identical: self targetClass ; 
	deny: conn isLoggedIn ;
	should:[ conn loginWithUserId: self userId password: self badPassword timeoutMs: self loginTimeMs] raise: 2713 ;
	deny: conn isLoggedIn ;
	assert: (conn loginWithUserId: self userId password: self password timeoutMs: self loginTimeMs) identical: conn ;
	assert: conn isLoggedIn ;
	deny: conn notLoggedIn ;
	assert: conn closeConnection identical: conn ;
	deny: conn isLoggedIn ;
	should:[ conn closeConnection ] raise: 2713 ;
	yourself
%
! ------------------- Remove existing behavior from GsAmqpTlsConnectionTestCase
removeAllMethods GsAmqpTlsConnectionTestCase
removeAllClassMethods GsAmqpTlsConnectionTestCase
! ------------------- Class methods for GsAmqpTlsConnectionTestCase
category: 'Accessing'
classmethod: GsAmqpTlsConnectionTestCase
caCertPath

^ caCertPath
%
category: 'Updating'
classmethod: GsAmqpTlsConnectionTestCase
caCertPath: newValue

caCertPath := newValue
%
category: 'Accessing'
classmethod: GsAmqpTlsConnectionTestCase
certPath

^ certPath
%
category: 'Updating'
classmethod: GsAmqpTlsConnectionTestCase
certPath: newValue

certPath := newValue
%
category: 'Connections'
classmethod: GsAmqpTlsConnectionTestCase
newBasicConnection

	^GsAmqpTlsConnection newOnHost: self hostname port: self port
%
category: 'Connections'
classmethod: GsAmqpTlsConnectionTestCase
newConnection

	^(GsAmqpTlsConnection
		newOnHost: self hostname
		port: self port
		caCertPath: self caCertPath
		certPath: self certPath
		keyPath: self privateKey
		keyPassphrase: nil)
			loginWithUserId: self userId
			password: self password
			timeoutMs: self loginTimeoutMs;
		yourself
%
category: 'Connections'
classmethod: GsAmqpTlsConnectionTestCase
newPreConnectConnection

	^(GsAmqpTlsConnection newOnHost: self hostname port: self port)
		caCertPath: self caCertPath;
		certPath: self certPath;
		privateKey: self privateKey;
		yourself
%
category: 'Connections'
classmethod: GsAmqpTlsConnectionTestCase
newPreLoginConnection

	^ (self newPreConnectConnection)
		setSocketOptions;
		_connectWithTimeoutMs: self loginTimeoutMs ;
		yourself
%
category: 'Accessing'
classmethod: GsAmqpTlsConnectionTestCase
privateKey

^ privateKey
%
category: 'Updating'
classmethod: GsAmqpTlsConnectionTestCase
privateKey: newValue

privateKey := newValue
%
category: 'Subclass methods'
classmethod: GsAmqpTlsConnectionTestCase
targetClass

^ GsAmqpTlsConnection
%
category: 'Accessing'
classmethod: GsAmqpTlsConnectionTestCase
verifyHostname

^ verifyHostname
%
category: 'Updating'
classmethod: GsAmqpTlsConnectionTestCase
verifyHostname: newValue

verifyHostname := newValue
%
category: 'Accessing'
classmethod: GsAmqpTlsConnectionTestCase
verifyPeer

^ verifyPeer
%
category: 'Updating'
classmethod: GsAmqpTlsConnectionTestCase
verifyPeer: newValue

verifyPeer := newValue
%
! ------------------- Instance methods for GsAmqpTlsConnectionTestCase
category: 'Accessing'
method: GsAmqpTlsConnectionTestCase
caCertPath

^ self class caCertPath
%
category: 'Accessing'
method: GsAmqpTlsConnectionTestCase
certPath

^ self class certPath
%
category: 'Accessing'
method: GsAmqpTlsConnectionTestCase
privateKey

^ self class privateKey
%
category: 'subclass methods'
method: GsAmqpTlsConnectionTestCase
targetClass

^ GsAmqpTlsConnection
%
category: 'tests'
method: GsAmqpTlsConnectionTestCase
testCreateNewTlsConnection

| conn cls |
cls := self targetClass.
[
conn := cls newOnHost: self hostname port: self port caCertPath: self caCertPath certPath: self certPath keyPath: self privateKey keyPassphrase: nil .
self _testNewConnection: conn.
conn := cls newOnHost: self hostname port: self port caCertPath: self caCertPath certPath: self certPath keyPath: self privateKey .
self _testNewConnection: conn.
conn := cls newOnHost: self hostname port: self port caCertPath: self caCertPath certPath: self certPath 
			keyString: (GsTlsPrivateKey newFromPemFile: self privateKey withPassphrase: nil) asPemString keyPassphrase: nil .
self _testNewConnection: conn.
conn := cls newOnHost: self hostname port: self port caCertPath: self caCertPath certPath: self certPath 
			keyObj: (GsTlsPrivateKey newFromPemFile: self privateKey withPassphrase: nil) .
self _testNewConnection: conn.
conn := nil.
] ensure:[ conn ifNotNil:[ conn _destroyConnection] ].

^ self
%
category: 'tests'
method: GsAmqpTlsConnectionTestCase
testTlsConnection

| conn |
conn := self class newBasicConnection.
[
self should:[ conn setSocketOptions] raise: 2318 ;
	should:[ conn caCertPath: self caCertPath ; setSocketOptions] raise: 2318 ;
	should:[ conn certPath: self certPath ; setSocketOptions] raise: 2318 ;
	assert: (conn privateKey: self privateKey ; setSocketOptions) identical: conn 
] ensure:[ conn _destroyConnection ].
^ self
%
category: 'tests'
method: GsAmqpTlsConnectionTestCase
testTlsConnection2

| conn |
conn := self class newBasicConnection.
[
self should:[ conn setSocketOptions] raise: 2318 ;
	should:[ conn caCertPath: true ; certPath: false ; privateKey: 2;  setSocketOptions] raise: ArgumentTypeError  ;
	assert: (conn caCertPath: self class caCertPath ; certPath: self class certPath ; privateKey: self class privateKey ; setSocketOptions) identical: conn 
] ensure:[ conn _destroyConnection ].
^ self
%
! ------------------- Remove existing behavior from GsAmqpBasicPropertiesTestCase
removeAllMethods GsAmqpBasicPropertiesTestCase
removeAllClassMethods GsAmqpBasicPropertiesTestCase
! ------------------- Class methods for GsAmqpBasicPropertiesTestCase
category: 'Flags'
classmethod: GsAmqpBasicPropertiesTestCase
allFlagMethodNames

^ GsAmqpBasicProperties class selectors select:[:each| 0 ~~ (each asString findPattern: { '_FLAG' } startingAt: 1)]
%
category: 'Flags'
classmethod: GsAmqpBasicPropertiesTestCase
allFlagValues

"GsAmqpBasicPropertiesTestCase allFlagValues"

^ self allFlagMethodNames collect:[:e| GsAmqpBasicProperties perform: e ]
%
! ------------------- Instance methods for GsAmqpBasicPropertiesTestCase
category: 'Tests'
method: GsAmqpBasicPropertiesTestCase
testBits

	| flagMethods inst |
	flagMethods := self class allFlagMethodNames.
	inst := GsAmqpBasicProperties new.
	"Initialize method should set this by default."
	self
		assert: inst flags
			identical: (inst class perform: #AMQP_BASIC_DELIVERY_MODE_FLAG);
		assert: inst deliveryMode identical: inst class AMQP_DELIVERY_PERSISTENT.
	flagMethods do: 
			[:sym |
			"Test set/clear/test works for each flag"
			inst flags: 0.
			self
				deny: (inst testFlag: sym);
				assert: (inst clearFlag: sym) identical: inst;
				deny: (inst testFlag: sym);
				assert: inst flags identical: 0;
				assert: (inst setFlag: sym) identical: inst;
				assert: (inst testFlag: sym);
				assert: inst flags identical: (inst class perform: sym);
				assert: (inst clearFlag: sym) identical: inst;
				deny: (inst testFlag: sym);
				assert: inst flags identical: 0].
	^self
%
category: 'Tests'
method: GsAmqpBasicPropertiesTestCase
testNoDuplicateBits

	| flagMethods flagValues |
	flagMethods := self class allFlagMethodNames.
	flagValues := self class allFlagValues asIdentitySet.	"Rejects any duplicate values"
	self
		assert: flagMethods size identical: flagValues size;
		yourself
%
! ------------------- Remove existing behavior from GsAmqpBytesTestCase
removeAllMethods GsAmqpBytesTestCase
removeAllClassMethods GsAmqpBytesTestCase
! ------------------- Class methods for GsAmqpBytesTestCase
! ------------------- Instance methods for GsAmqpBytesTestCase
category: 'Tests'
method: GsAmqpBytesTestCase
testEmptyByteArray

	^self _testEmptyObj: (GsAmqpBytes fromBytes: ByteArray new)
%
category: 'Tests'
method: GsAmqpBytesTestCase
testEmptyBytes

	^self _testEmptyObj: GsAmqpBytes emptyBytes
%
category: 'Tests'
method: GsAmqpBytesTestCase
testEmptyString

	^self _testEmptyObj: (GsAmqpBytes fromString: String new)
%
category: 'Tests'
method: GsAmqpBytesTestCase
testFromBytes


| ba obj obj2 |

ba := ByteArray withRandomBytes: 32.
obj := GsAmqpBytes fromBytes: ba.

^ self assert: obj class identical: GsAmqpBytes ;
	assert: obj len identical: ba size ;
	assert: (obj2 := obj bytes) class identical: CByteArray ;
	assert: (obj2 := obj convertToByteArray) class equals: ByteArray ;
	assert: obj2 equals: ba ;
	yourself
%
category: 'Tests'
method: GsAmqpBytesTestCase
testFromString


| string obj obj2 |

string := 'This is a string' .
obj := GsAmqpBytes fromString: string.

^ self assert: obj class identical: GsAmqpBytes ;
	assert: obj len identical: string size ;
	assert: (obj2 := obj bytes) class identical: CByteArray ;
	assert: (obj2 := obj convertToString) class equals: String ;
	assert: obj2 equals: string ;
	assert: (obj2 := obj convertToByteArray) class equals: ByteArray ;
	yourself
%
category: 'Tests'
method: GsAmqpBytesTestCase
testNil

	^self _testEmptyObj: (GsAmqpBytes fromBytes: nil) ;
		_testEmptyObj: (GsAmqpBytes fromString: nil) 
%
category: 'Tests'
method: GsAmqpBytesTestCase
_testEmptyObj: obj

^ self assert: obj class identical: GsAmqpBytes ;
	assert: obj len identical: 0 ;
	assert: obj bytesAddress identical: 0 ;
	assert: obj bytes identical: nil ;
	assert: (obj utf8FromAmqpBytesAtOffset: 0) identical: nil ;
	assert: (obj utf16FromAmqpBytesAtOffset: 0) identical: nil ;
	assert: (obj stringFromAmqpBytesAtOffset: 0) identical: nil ;
	assert: (obj byteArrayFromAmqpBytesAtOffset: 0) identical: nil ;
	yourself
%
