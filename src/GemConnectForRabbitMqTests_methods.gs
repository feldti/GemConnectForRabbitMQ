fileformat utf8
set compile_env: 0
! ------------------- Remove existing behavior from GsAmqpAbstractTestCase
removeallmethods GsAmqpAbstractTestCase
removeallclassmethods GsAmqpAbstractTestCase
! ------------------- Class methods for GsAmqpAbstractTestCase
category: 'Testing'
classmethod: GsAmqpAbstractTestCase
isAbstract

^ self sunitName = #GsAmqpAbstractTestCase
%
category: 'Accessing'
classmethod: GsAmqpAbstractTestCase
tlsTestsEnabled

^ tlsTestsEnabled ifNil:[ true ] ifNotNil:[ tlsTestsEnabled ]
%
category: 'Accessing'
classmethod: GsAmqpAbstractTestCase
tlsTestsEnabled: boolean

tlsTestsEnabled := boolean
%
! ------------------- Instance methods for GsAmqpAbstractTestCase
category: 'Accessing'
method: GsAmqpAbstractTestCase
tlsTestsEnabled

^ self class tlsTestsEnabled
%
category: 'Testing'
method: GsAmqpAbstractTestCase
_testInitializeFromCWith: inst

|copy|

self assert: inst autoRelease.
copy := inst shallowCopy.
self assert: copy autoRelease ;
	assert: inst equals: copy .
copy initializeFromC.
self assert: copy equals: inst.
^ self
%
! ------------------- Remove existing behavior from GsAmqpBasicPropertiesTestCase
removeallmethods GsAmqpBasicPropertiesTestCase
removeallclassmethods GsAmqpBasicPropertiesTestCase
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
	self assert: inst flags identical: 0.
	inst flushToC.
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
testInitializeFromC

	| flagMethods inst inst2 headers x |
	headers := GsAmqpTable newFromArrayOfPairs: { 'A' . 'a' . 'B' . 'b' . 'C' . 'c' . 'D' . 'd' } .
	inst := GsAmqpBasicProperties new.
	inst 
		flags: 0 ;
		amqpUserId: 'amqpUserId' ;
		appId: 'appId' ;
		clusterId: 'clusterId' ;
		contentEncoding: 'contentEncoding' ;
		contentType: 'contentType' ;
		correlationId: 'correlationId' ;
		deliveryMode: 2 ;
		expiration: 'expiration' ;
		messageId: 'messageId' ;
		priority: 9 ;
		replyTo: 'replyTo' ;
		timestamp: 3886124846 ;
		type: 'type' ;
		headers: headers ;
		flushToC .
	inst2 := GsAmqpBasicProperties fromCPointer: inst.
	self 
		assert: (x := inst2 flags) identical: inst flags ;
		assert: (x := inst2 amqpUserId asString) equals: 'amqpUserId' ;
		assert: (x := inst2 appId asString) equals: 'appId' ;
		assert: (x := inst2 clusterId asString) equals: 'clusterId' ;
		assert: (x := inst2 contentEncoding asString) equals:  'contentEncoding' ;
		assert: (x := inst2 contentType asString) equals: 'contentType' ;
		assert: (x := inst2 correlationId asString) equals: 'correlationId' ;
		assert: (x := inst2 deliveryMode) identical: 2 ;
		assert: (x := inst2 expiration asString) equals: 'expiration' ;
		assert: (x := inst2 messageId asString) equals: 'messageId' ;
		assert: (x := inst2 priority) identical: 9 ;
		assert: (x := inst2 replyTo asString) equals: 'replyTo' ;
		assert: (x := inst2 timestamp) identical: 3886124846 ;
		assert: (x := inst2 type asString) equals: 'type' ;
		assert: (x :=  inst2 headers)  equals: headers ;
		assert: inst equals: inst2 .

^ self

		
		
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
removeallmethods GsAmqpBytesTestCase
removeallclassmethods GsAmqpBytesTestCase
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
	assert: (obj2 := obj asCByteArray) class identical: CByteArray ;
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
	assert: (obj2 := obj asCByteArray) class identical: CByteArray ;
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
	assert: obj asCByteArray identical: nil ;
	assert: (obj utf8FromAmqpBytesAtOffset: 0) identical: nil ;
	assert: (obj utf16FromAmqpBytesAtOffset: 0) identical: nil ;
	assert: (obj stringFromAmqpBytesAtOffset: 0) identical: nil ;
	assert: (obj byteArrayFromAmqpBytesAtOffset: 0) identical: nil ;
	yourself
%
! ------------------- Remove existing behavior from GsAmqpConnectionTestCase
removeallmethods GsAmqpConnectionTestCase
removeallclassmethods GsAmqpConnectionTestCase
! ------------------- Class methods for GsAmqpConnectionTestCase
category: 'Accessing'
classmethod: GsAmqpConnectionTestCase
amqpUserId

^ amqpUserId
%
category: 'Updating'
classmethod: GsAmqpConnectionTestCase
amqpUserId: newValue

amqpUserId := newValue
%
category: 'Testing'
classmethod: GsAmqpConnectionTestCase
credentialsAreSetup

self amqpUserId ifNil:[ ^ false ].
self password ifNil:[ ^ false ].
self hostname ifNil:[ ^ false ].
self vhost ifNil:[ ^ false ].
^ true
%
category: 'Accessing'
classmethod: GsAmqpConnectionTestCase
hostname

^ hostname
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

	^(GsAmqpConnection newOnHost: self hostname port: self port vhost: self vhost)
		loginWithUserId: self amqpUserId
		password: self password
		timeoutMs: self loginTimeoutMs
%
category: 'Connections'
classmethod: GsAmqpConnectionTestCase
newPreConnectConnection

"Create a connection and connect to the broker but do not connect or login."

	^(GsAmqpConnection newOnHost: self hostname port: self port vhost: self vhost)
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
vhost

^ vhost ifNil:[ GsAmqpConnection defaultVhost ] ifNotNil:[ vhost ]
%
category: 'Updating'
classmethod: GsAmqpConnectionTestCase
vhost: newValue

vhost := newValue
%
! ------------------- Instance methods for GsAmqpConnectionTestCase
category: 'Accessing'
method: GsAmqpConnectionTestCase
amqpUserId

^ self class amqpUserId
%
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
testBadVhost

| con  |

con := self class newPreLoginConnection.
con vhost: 'bogusvhost'.
[
	self should:[ con _loginWithUserId: self amqpUserId password: self password]  raise: GsRabbitMqError  "invalid uid and password"
] ensure:[ con _destroyConnection ] .
^ self
%
category: 'Tests'
method: GsAmqpConnectionTestCase
testCloseConnection

| cons |
cons := Array new.

[
self should:[(cons add: self class newPreConnectConnection) _closeConnection] raise: GsRabbitMqError ; "close connection not open"
	should:[ self class newConnection closeConnection _closeConnection] raise: GsRabbitMqError ; "close already closed connection"
	should:[ self class newConnection closeConnection _destroyConnection] raise: GsRabbitMqError ; "destroy already destroyed connection"
	should:[ self class newConnection closeConnection closeConnection] raise: GsRabbitMqError  "close already destroyed connection"
] ensure:[ cons do:[:e| e _destroyConnection ] ].
^ self
%
category: 'Tests'
method: GsAmqpConnectionTestCase
testConnection

| cons |
cons := Array new.

[
self should:[(cons add: (self targetClass newOnHost: 'bogus')) _connectWithTimeoutMs: 1000] raise: GsRabbitMqError ; "invalid hostname"
	should:[(cons add: (self targetClass newOnHost: self hostname port: 1000000)) _connectWithTimeoutMs: 1000] raise: GsRabbitMqError ; "invalid port"
	should:[(cons add: (self targetClass newOnHost: self hostname)) _connectWithTimeoutMs: true] raise: 2094 ; "Invalid timeout arg"
	should:[(cons add: (self targetClass newOnHost: self hostname port: 65530)) _connectWithTimeoutMs: 1000] raise: GsRabbitMqError ;  "invalid port"
	should:[(cons add: (self targetClass newOnHost: self hostname port: true)) _connectWithTimeoutMs: 1000] raise: ArgumentError  "invalid port"
] ensure:[ cons do:[:e| e _destroyConnection ] ].
^ self
%
category: 'Tests'
method: GsAmqpConnectionTestCase
testCreateNewConnection

| conn cls |
cls := self targetClass.
[
conn := cls newOnHost: self hostname port: self port vhost: self vhost.
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
 	should:[(cons add: (self class newPreLoginConnection)) _loginWithUserId: 'bogus' password: 'bogus2'] raise: GsRabbitMqError ; "invalid uid and password"
	should:[(cons add: (self class newPreLoginConnection)) _loginWithUserId: true password: 'bogus2'] raise: ArgumentTypeError ; "invalid uid and password"
	should:[(cons add: (self class newPreLoginConnection)) _loginWithUserId: self  amqpUserId password: false ] raise: ArgumentTypeError ; "invalid uid and password"
	should:[(cons add: (self class newPreLoginConnection)) _loginWithUserId: self  amqpUserId password: 'bogus2'] raise: GsRabbitMqError  "invalid password"
] ensure:[ cons do:[:e| e _destroyConnection ] ].
^ self
%
category: 'Accessing'
method: GsAmqpConnectionTestCase
vhost

^ self class vhost
%
category: 'Tests'
method: GsAmqpConnectionTestCase
_testNewConnection: conn

^self assert: conn class identical: self targetClass ;
	deny: conn isLoggedIn ;
	should:[ conn loginWithUserId: self amqpUserId password: self badPassword timeoutMs: self loginTimeMs] raise: GsRabbitMqError ;
	deny: conn isLoggedIn ;
	assert: (conn loginWithUserId: self amqpUserId password: self password timeoutMs: self loginTimeMs) identical: conn ;
	assert: conn isLoggedIn ;
	deny: conn notLoggedIn ;
	assert: conn closeConnection identical: conn ;
	deny: conn isLoggedIn ;
	should:[ conn closeConnection ] raise: GsRabbitMqError ;
	yourself
%
! ------------------- Remove existing behavior from GsAmqpExampleTestCase
removeallmethods GsAmqpExampleTestCase
removeallclassmethods GsAmqpExampleTestCase
! ------------------- Class methods for GsAmqpExampleTestCase
! ------------------- Instance methods for GsAmqpExampleTestCase
category: 'Setup and Tear Down'
method: GsAmqpExampleTestCase
setUp

| cls |
super setUp.
cls := GsAmqpConnectionTestCase .
self assert: cls credentialsAreSetup description: ('RabbitMq credentials must be specifed in ', cls name, ' in order to run this test case').
GsAmqpExample initialize ;
				hostname: cls hostname ;
				port: cls port ;
				amqpUserId: cls amqpUserId ;
				password: cls password ;
				vhost: cls vhost .
self assert: System commitTransaction description: 'commit failure'.
^ self
%
category: 'tests'
method: GsAmqpExampleTestCase
testRunExamples

| consumer producer |
[
self assert: (consumer := GsTsExternalSession newDefault login) class identical: GsTsExternalSession ;
	assert: consumer isLoggedIn.
self assert: (producer := GsTsExternalSession newDefault login) class identical: GsTsExternalSession ;
	assert: producer isLoggedIn.

1 to: GsAmqpExample numExamples do:[:n| | tmp |
	consumer nbExecute: ('GsAmqpExample runConsumerExampleNumber: ', n asString , ' useTls: false').
	producer nbExecute: ('	GsAmqpExample runProducerExampleNumber: ', n asString, ' useTls: false').
	consumer waitForResultForSeconds: 30.
	producer waitForResultForSeconds: 30.
	self assert: consumer lastResult ; assert: producer lastResult.
].

] ensure:[ consumer ifNotNil:[ consumer logout ]. producer ifNotNil:[ producer logout] ].
^ self
%
! ------------------- Remove existing behavior from GsAmqpFieldValueTestCase
removeallmethods GsAmqpFieldValueTestCase
removeallclassmethods GsAmqpFieldValueTestCase
! ------------------- Class methods for GsAmqpFieldValueTestCase
! ------------------- Instance methods for GsAmqpFieldValueTestCase
category: 'Tests'
method: GsAmqpFieldValueTestCase
testBooleans

|t f tc fc bool |

bool := GsAmqpFieldValue AMQP_FIELD_KIND_BOOLEAN .
^ self
	assert: (t := GsAmqpFieldValue newForObject: true) class identical: GsAmqpFieldValue ;
	assert: (f := GsAmqpFieldValue newForObject: false) class identical: GsAmqpFieldValue ;
	assert: (tc := GsAmqpFieldValue newForObject: true) class identical: GsAmqpFieldValue ;
	assert: (fc := GsAmqpFieldValue newForObject: false) class identical: GsAmqpFieldValue ;
	assert: t equals: t ;
	assert: f equals: f ;
	deny: t equals: f ;
	assert: t equals: tc ;
	assert: f equals: fc ;
	assert: t getKindFromC identical: bool ;
	assert: f getKindFromC identical: bool ;
	assert: tc getKindFromC identical: bool ;
	assert: fc getKindFromC identical: bool ;
	assert: t valueIsBoolean ;
	deny: t valueIsString ;
	deny: t valueIsInteger ;
	assert: t getValueFromC ;
	assert: tc getValueFromC ;
	deny: f getValueFromC ;
	deny: fc getValueFromC ;
	yourself 
	
%
category: 'Tests'
method: GsAmqpFieldValueTestCase
testInitializeFromC

^ self 
_testInitializeFromCForObj: 'abc' ;
_testInitializeFromCForObj: 123 ;
_testInitializeFromCForObj: true ;
yourself
%
category: 'Tests'
method: GsAmqpFieldValueTestCase
testIntegers

| int t2 t22 m2 m22 |

int := GsAmqpFieldValue AMQP_FIELD_KIND_I64 .
^ self
	assert: (t2 := GsAmqpFieldValue newForObject: 2) class identical: GsAmqpFieldValue ;
	assert: (m2 := GsAmqpFieldValue newForObject: -2) class identical: GsAmqpFieldValue ;
	assert: (t22 := GsAmqpFieldValue newForObject: 2) class identical: GsAmqpFieldValue ;
	assert: (m22 := GsAmqpFieldValue newForObject: -2) class identical: GsAmqpFieldValue ;
	assert: t2 equals: t2 ;
	assert: m2 equals: m2 ;
	deny: t2 equals: m2 ;
	assert: t2 equals: t22 ;
	assert: m2 equals: m22 ;
	assert: t2 getKindFromC identical: int ;
	assert: m2 getKindFromC identical: int ;
	assert: t22 getKindFromC identical: int ;
	assert: m22 getKindFromC identical: int ;
	assert: t2 valueIsInteger ;
	deny: t2 valueIsString ;
	deny: t2 valueIsBoolean ;
	assert: t2 getValueFromC identical: 2;
	assert: t22 getValueFromC identical: 2;
	assert: m2 getValueFromC  identical: -2;
	assert: m22 getValueFromC  identical: -2;
	yourself 
	
%
category: 'Tests'
method: GsAmqpFieldValueTestCase
testStrings

| strKind str1  str1Field str1Field2 str2  str2Field str2Field2 |

strKind := GsAmqpFieldValue AMQP_FIELD_KIND_UTF8 .
str1 := 'abc'.
str2 := 'ABC'.

^ self
	assert: (str1Field := GsAmqpFieldValue newForObject: str1) class identical: GsAmqpFieldValue ;
	assert: (str2Field := GsAmqpFieldValue newForObject: str2) class identical: GsAmqpFieldValue ;
	assert: (str1Field2 := GsAmqpFieldValue newForObject: str1) class identical: GsAmqpFieldValue ;
	assert: (str2Field2 := GsAmqpFieldValue newForObject: str2) class identical: GsAmqpFieldValue ;
	assert: str1Field equals: str1Field ;
	assert: str2Field equals: str2Field ;
	deny: str1Field equals: str2Field ;
	assert: str1Field equals: str1Field2 ;
	assert: str2Field equals: str2Field2 ;
	assert: str1Field getKindFromC identical: strKind ;
	assert: str2Field getKindFromC identical: strKind ;
	assert: str1Field2 getKindFromC identical: strKind ;
	assert: str2Field2 getKindFromC identical: strKind ;
	deny: str1Field valueIsInteger ;
	assert: str1Field valueIsString ;
	deny: str1Field valueIsBoolean ;
	assert: str1Field getValueFromC equals: str1;
	assert: str1Field2 getValueFromC equals: str1;
	assert: str2Field getValueFromC  equals: str2;
	assert: str2Field2 getValueFromC  equals: str2;
	yourself 
	
%
category: 'Tests'
method: GsAmqpFieldValueTestCase
_testInitializeFromCForObj: anObj

^ self _testInitializeFromCWith: (GsAmqpFieldValue newForObject: anObj)
%
! ------------------- Remove existing behavior from GsAmqpTableEntryArrayTestCase
removeallmethods GsAmqpTableEntryArrayTestCase
removeallclassmethods GsAmqpTableEntryArrayTestCase
! ------------------- Class methods for GsAmqpTableEntryArrayTestCase
category: 'Data'
classmethod: GsAmqpTableEntryArrayTestCase
dictionary

| keys values resultIdx result |
keys := self keys.
values := self values.
result := KeyValueDictionary new: (2 * keys size).
1 to: keys size do:[:n| |k v|
	k := keys at: n.
	v := values at: n.
	result at: k put: v.	
].
	
^ result
%
category: 'Data'
classmethod: GsAmqpTableEntryArrayTestCase
keys

^ Array with: 'a' with: 'b' with: 'c' with: 'd'
%
category: 'Data'
classmethod: GsAmqpTableEntryArrayTestCase
pairs

| keys values resultIdx result |
keys := self keys.
values := self values.
result := Array new: (2 * keys size).
resultIdx := 1.
1 to: keys size do:[:n| |k v|
	k := keys at: n.
	v := values at: n.
	result at: resultIdx put: k ; at: (resultIdx + 1) put: v.
	resultIdx := resultIdx + 2.
].
	
^ result
%
category: 'Data'
classmethod: GsAmqpTableEntryArrayTestCase
values

^ Array with: 'A' with: 'B' with: 2 with: true
%
! ------------------- Instance methods for GsAmqpTableEntryArrayTestCase
category: 'Tests'
method: GsAmqpTableEntryArrayTestCase
dictionary

^ self class dictionary
%
category: 'Tests'
method: GsAmqpTableEntryArrayTestCase
keys

^ self class keys
%
category: 'Tests'
method: GsAmqpTableEntryArrayTestCase
pairs

^ self class pairs
%
category: 'Tests'
method: GsAmqpTableEntryArrayTestCase
testCompare

|a b c|

a := GsAmqpTableEntryArray newFromArrayOfPairs: self pairs.
b := GsAmqpTableEntryArray newFromDictionary: self dictionary.
c := GsAmqpTableEntryArray newFromKeys: self keys values: self values.
^ self 
	assert: a equals: b ;
	assert: a equals: c ;
	assert: b equals: c ;
	yourself
%
category: 'Tests'
method: GsAmqpTableEntryArrayTestCase
testIntializeFromC


^ self 
	_testInitializeFromCWith: (GsAmqpTableEntryArray newFromArrayOfPairs: self pairs) ;
	_testInitializeFromCWith: (GsAmqpTableEntryArray newFromDictionary: self dictionary) ;
	_testInitializeFromCWith: (GsAmqpTableEntryArray newFromKeys: self keys values: self values) ;
	yourself
%
category: 'Tests'
method: GsAmqpTableEntryArrayTestCase
values

^ self class values
%
! ------------------- Remove existing behavior from GsAmqpTableEntryTestCase
removeallmethods GsAmqpTableEntryTestCase
removeallclassmethods GsAmqpTableEntryTestCase
! ------------------- Class methods for GsAmqpTableEntryTestCase
! ------------------- Instance methods for GsAmqpTableEntryTestCase
category: 'Tests'
method: GsAmqpTableEntryTestCase
testCompare


|key1 value1 key2 value2 inst1 inst2|
key1 := 'key1'.
value1 := 'value1'.
key2 := 'key2'.
value2 := 'value2'.

inst1 := GsAmqpTableEntry newForKey: key1 value: value1 .
inst2  := GsAmqpTableEntry newForKey: key1 value: value1 .
self
	assert: inst1 equals: inst1 ;
	assert: inst1 equals: inst2 ;
	assert: inst1 key equals: inst2 key ;
	assert: inst1 value equals: inst2 value ;
	assert: inst1 getKeyFromC equals: inst2 getKeyFromC ;
	assert: inst1 getValueFromC equals: inst2 getValueFromC .

inst2 := GsAmqpTableEntry newForKey: key2 value: value2 .
self 
	assert: inst2 equals: inst2 ;
	deny: inst1 equals: inst2 
%
category: 'Tests'
method: GsAmqpTableEntryTestCase
testInitializeFromC

"Test all 3 fields kinds: Boolean, Integer and String"

^ self 
	_testInitializeFromCWith: (GsAmqpTableEntry newForKey: 'abc' value: true) ;
	_testInitializeFromCWith: (GsAmqpTableEntry newForKey: 'abc' value: 123 ) ;
	_testInitializeFromCWith: (GsAmqpTableEntry newForKey: 'abc' value: 'ABC' ) ;
	yourself

%
! ------------------- Remove existing behavior from GsAmqpTableTestCase
removeallmethods GsAmqpTableTestCase
removeallclassmethods GsAmqpTableTestCase
! ------------------- Class methods for GsAmqpTableTestCase
! ------------------- Instance methods for GsAmqpTableTestCase
category: 'Tests'
method: GsAmqpTableTestCase
testCompare

| inst1 inst2 inst3 |
inst1 := GsAmqpTable newFromArrayOfPairs: GsAmqpTableEntryArrayTestCase pairs.
inst2 := GsAmqpTable newFromDictionary: GsAmqpTableEntryArrayTestCase dictionary.
inst3 := GsAmqpTable newFromKeys: GsAmqpTableEntryArrayTestCase keys values: GsAmqpTableEntryArrayTestCase values.

^ self 
	assert: inst1 equals: inst2 ;
	assert: inst1 equals: inst3 ;
	assert: inst2 equals: inst2 ;
	yourself

%
category: 'Tests'
method: GsAmqpTableTestCase
testIntializeFromC

| inst1 inst2 inst3 |
inst1 := GsAmqpTable newFromArrayOfPairs: GsAmqpTableEntryArrayTestCase pairs.
inst2 := GsAmqpTable newFromDictionary: GsAmqpTableEntryArrayTestCase dictionary.
inst3 := GsAmqpTable newFromKeys: GsAmqpTableEntryArrayTestCase keys values: GsAmqpTableEntryArrayTestCase values.

^ self 
 
	_testInitializeFromCWith: inst1 ;
	_testInitializeFromCWith: inst2 ;
	_testInitializeFromCWith: inst3 ;
	yourself
%
! ------------------- Remove existing behavior from GsAmqpTlsConnectionTestCase
removeallmethods GsAmqpTlsConnectionTestCase
removeallclassmethods GsAmqpTlsConnectionTestCase
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
category: 'Testing'
classmethod: GsAmqpTlsConnectionTestCase
credentialsAreSetup

super credentialsAreSetup ifFalse:[ ^ false ].
self certPath ifNil:[ ^ false ].
self caCertPath ifNil:[ ^ false ].
self privateKey  ifNil:[ ^ false ].
^ true
%
category: 'Connections'
classmethod: GsAmqpTlsConnectionTestCase
newBasicConnection

	^GsAmqpTlsConnection newOnHost: self hostname port: self port vhost: self vhost
%
category: 'Connections'
classmethod: GsAmqpTlsConnectionTestCase
newConnection

	^(GsAmqpTlsConnection
		newOnHost: self hostname
		port: self port
		vhost: self vhost
		caCertPath: self caCertPath
		certPath: self certPath
		keyPath: self privateKey
		keyPassphrase: nil)
			loginWithUserId: self amqpUserId
			password: self password
			timeoutMs: self loginTimeoutMs;
		yourself
%
category: 'Connections'
classmethod: GsAmqpTlsConnectionTestCase
newPreConnectConnection

	^(GsAmqpTlsConnection newOnHost: self hostname port: self port vhost: self vhost)
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
category: 'Accessing'
classmethod: GsAmqpTlsConnectionTestCase
privateKeyPassphrase

^ privateKeyPassphrase
%
category: 'Updating'
classmethod: GsAmqpTlsConnectionTestCase
privateKeyPassphrase: newValue

privateKeyPassphrase := newValue
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
self tlsTestsEnabled ifFalse:[ ^ self ] .
cls := self targetClass.
[
conn := cls newOnHost: self hostname port: self port vhost: self vhost caCertPath: self caCertPath certPath: self certPath keyPath: self privateKey keyPassphrase: nil .
self _testNewConnection: conn.
conn := cls newOnHost: self hostname port: self port vhost: self vhost  caCertPath: self caCertPath certPath: self certPath keyPath: self privateKey .
self _testNewConnection: conn.
conn := cls newOnHost: self hostname port: self port vhost: self vhost  caCertPath: self caCertPath certPath: self certPath
			keyString: (GsTlsPrivateKey newFromPemFile: self privateKey withPassphrase: nil) asPemString keyPassphrase: nil .
self _testNewConnection: conn.
conn := cls newOnHost: self hostname port: self port vhost: self vhost  caCertPath: self caCertPath certPath: self certPath
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
self tlsTestsEnabled ifFalse:[ ^ self ] .
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
self tlsTestsEnabled ifFalse:[ ^ self ] .
conn := self class newBasicConnection.
[
self should:[ conn setSocketOptions] raise: 2318 ;
	should:[ conn caCertPath: true ; certPath: false ; privateKey: 2;  setSocketOptions] raise: ArgumentTypeError  ;
	assert: (conn caCertPath: self class caCertPath ; certPath: self class certPath ; privateKey: self class privateKey ; setSocketOptions) identical: conn
] ensure:[ conn _destroyConnection ].
^ self
%
! ------------------- Remove existing behavior from GsAmqpTlsExampleTestCase
removeallmethods GsAmqpTlsExampleTestCase
removeallclassmethods GsAmqpTlsExampleTestCase
! ------------------- Class methods for GsAmqpTlsExampleTestCase
! ------------------- Instance methods for GsAmqpTlsExampleTestCase
category: 'Setup'
method: GsAmqpTlsExampleTestCase
setUp

| cls |
self tlsTestsEnabled ifFalse:[ ^ self ] .
super setUp.
cls := GsAmqpTlsConnectionTestCase .
self assert: cls credentialsAreSetup description: ('RabbitMq credentials must be specifed in ', cls name, ' in order to run this test case').
GsAmqpExample caCertPath: cls caCertPath ;
				certPath: cls certPath ;
				privateKey: cls privateKey ;
				privateKeyPassphrase: cls privateKeyPassphrase .
self assert: System commitTransaction description: 'commit failure'.
^ self
%
category: 'tests'
method: GsAmqpTlsExampleTestCase
testRunExamples

| consumer producer |
self tlsTestsEnabled ifFalse:[ ^ self ] .
[
self assert: (consumer := GsTsExternalSession newDefault login) class identical: GsTsExternalSession ;
	assert: consumer isLoggedIn.
self assert: (producer := GsTsExternalSession newDefault login) class identical: GsTsExternalSession ;
	assert: producer isLoggedIn.

1 to: GsAmqpExample numExamples do:[:n| | tmp |
	consumer nbExecute: ('GsAmqpExample runConsumerExampleNumber: ', n asString , ' useTls: true').
	producer nbExecute: ('	GsAmqpExample runProducerExampleNumber: ', n asString, ' useTls: true').
	consumer waitForResultForSeconds: 30.
	producer waitForResultForSeconds: 30.
	self assert: consumer lastResult ; assert: producer lastResult.
].

] ensure:[ consumer ifNotNil:[ consumer logout ]. producer ifNotNil:[ producer logout] ].
^ self
%
