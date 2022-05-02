fileformat utf8
! ------------------- Remove existing behavior from GsAmqpConnection
removeAllMethods GsAmqpConnection
removeAllClassMethods GsAmqpConnection
! ------------------- Class methods for GsAmqpConnection
category: 'Constants'
classmethod: GsAmqpConnection
defaultPort

^ 5672
%
category: 'Constants'
classmethod: GsAmqpConnection
maxChannels

^ 16
%
category: 'Instance Creation'
classmethod: GsAmqpConnection
newOnHost: hostOrIp

^ self newOnHost: hostOrIp port: self defaultPort
%
category: 'Instance Creation'
classmethod: GsAmqpConnection
newOnHost: hostOrIp port: aPort

	| result |
	result := super new initialize.
	^result
		host: hostOrIp;
		port: aPort ;
		yourself
%
! ------------------- Instance methods for GsAmqpConnection
category: 'Message Acknowlegement'
method: GsAmqpConnection
ackMessageWithDeliveryTag: tag channel: channel multiple: bool

	| rc |
	self validateOpenChannelId: channel; validateConnection.
	rc := self library
				amqp_basic_ack_: self connection
				_: channel
				_: tag
				_: bool asBit.
	self getRpcReplyForOperation: 'amqp_basic_ack'.
	^rc == 0
		ifTrue: [self]
		ifFalse: [GsRabbitMqError signalWithErrorCode: rc library: self library]
%
category: 'Channels'
method: GsAmqpConnection
addOpenChannelWithId: anInt

self openChannels at: anInt put: anInt.
^ self
%
category: 'Converting'
method: GsAmqpConnection
asGsSocket

"Answer a GsSocket that uses the same file descriptor used by the receiver to converse with the broker.
This result is intended to be used by read-only methods which do not alter the socket state  such as #readWillNotBlockWithin: .
Program behavior after modifying or closing the socket is undefined."

| fd |
self validateConnection.
fd := self library amqp_get_sockfd_: self connection.
^fd > 0 ifTrue:[ GsSocket fromFileHandle: fd ]
		ifFalse:[ GsRabbitMqError signalForOperation: 'The connection is not connected to the broker' ]
%
category: 'Queues - Private'
method: GsAmqpConnection
basicGetFromQueueWithName: name channel: channelId autoAck: bool
	"Attempts to bind the named queue to exchange named exchange. Answers the receiver on success."

	| reply |
	self validateOpenChannelId: channelId; validateConnection.
	reply := self replyObject clearForReuse.
	self library
		amqp_basic_get_: reply
		_: self connection
		_: channelId
		_: (GsAmqpBytes fromString: name)
		_: bool asBit .
	reply initializeFromC.
	^reply isSuccess ifTrue: [self] ifFalse: [reply raiseExceptionForOperation: 'amqp_basic_get' ]
%
category: 'Queues - Private'
method: GsAmqpConnection
basicGetFromQueueWithName: name channel: channelId noAck: bool
	"Attempts to bind the named queue to exchange named exchange. Answers the receiver on success."

	| reply |
	self validateOpenChannelId: channelId; validateConnection.
	reply := self replyObject clearForReuse.
	self library
		amqp_basic_get_: reply
		_: self connection
		_: channelId
		_: (GsAmqpBytes fromString: name)
		_: bool asBit .
	reply initializeFromC.
	^reply isSuccess ifTrue: [self] ifFalse: [reply raiseExceptionForOperation: 'amqp_basic_get' ]
%
category: 'Queues'
method: GsAmqpConnection
beginConsumingQueueWithName: name channel: channelId consumerTag: consumerTag noLocal: noLocal noAck: noAck exclusive: exclusive
	"consumerTag may be nil or an empty string in which case a name will be assigned by the broker. Answers a String which is the consumer tag"

	| result |
	self validateOpenChannelId: channelId; validateConnection.
	result := self library
				amqp_basic_consume_: self connection
				_: channelId
				_: (GsAmqpBytes fromString: name)
				_: (GsAmqpBytes fromString: consumerTag)
				_: noLocal asBit
				_: noAck asBit
				_: exclusive asBit
				_: GsAmqpTable emptyTable.
	self getRpcReplyForOperation: 'amqp_basic_consume'.
	^( GsAmqpBytes fromCPointer: result) convertToString
%
category: 'Exchanges'
method: GsAmqpConnection
bindExchangeNamed: srcExchange to: destExchange channel: channelArg routingKey: routingKey

	self validateOpenChannelId: channelArg; validateConnection.
	self library
		amqp_exchange_bind_: self connection
		_: channelArg
		_: (GsAmqpBytes fromString: destExchange)
		_: (GsAmqpBytes fromString: srcExchange)
		_: (GsAmqpBytes fromString: routingKey)
		_: GsAmqpTable emptyTable.
	self getRpcReplyForOperation: 'amqp_exchange_bind' .	"Raises exception on error"
	^self
%
category: 'Queues'
method: GsAmqpConnection
bindQueueWithName: name toExchangeWithName: exchange channel: channelId routingKey: routingKey
	"Attempts to bind the named queue to exchange named exchange. Answers the receiver on success."

	^self
		bindQueueWithName: name
		toExchangeWithName: exchange
		channel: channelId
		routingKey: routingKey
		arguments: GsAmqpTable emptyTable
%
category: 'Queues'
method: GsAmqpConnection
bindQueueWithName: name toExchangeWithName: exchange channel: channelId routingKey: routingKey arguments: args
	"Attempts to bind the named queue to exchange named exchange. Answers the receiver on success."

	self validateOpenChannelId: channelId; validateConnection.
	self library
		amqp_queue_bind_: self connection
		_: channelId
		_: (GsAmqpBytes fromString: name)
		_: (GsAmqpBytes fromString: exchange)
		_: (GsAmqpBytes fromString: routingKey)
		_: args .
	^self getRpcReplyForOperation: 'amqp_queue_bind'
%
category: 'Channels'
method: GsAmqpConnection
closeAllChannels

	self openChannels
		do: [:eachChannelId | eachChannelId ifNotNil: [self closeChannelWithId: eachChannelId]].
	^self
%
category: 'Channels'
method: GsAmqpConnection
closeChannelWithId: anInt

	(self hasOpenChannelWithId: anInt)
		ifFalse: [^self].
	self validateConnection.
	[| reply |
	reply := self replyObject clearForReuse.
	self library amqp_channel_close_: reply _: self connection _: anInt _: self library class AMQP_REPLY_SUCCESS.
	reply initializeFromC.
	reply isSuccess ifFalse: [^reply raiseExceptionForOperation: 'amqp_channel_close' ]]
			ensure: [self removeOpenChannelWithId: anInt].
	^self
%
category: 'Logout'
method: GsAmqpConnection
closeConnection


^ self _closeConnection ; _destroyConnection ; yourself
%
category: 'Transactions'
method: GsAmqpConnection
commitTransactionOnChannel: channelId

	| res |
	self validateOpenChannelId: channelId ; validateConnection.
	res := self library amqp_tx_commit_: self connection _: channelId.
	^ self getRpcReplyForOperation: 'amqp_tx_commit'.
%
category: 'Accessing'
method: GsAmqpConnection
connection
	^connection
%
category: 'Updating'
method: GsAmqpConnection
connection: newValue
	connection := newValue
%
category: 'Consuming'
method: GsAmqpConnection
consumeMessageInto: aGsAmqpEnvelope timeoutMs: ms
	"Get the next available message. Note message may be for any channel and from any queue.
	If successful, store the message in aGsAmqpEnvelopeand return true. If the timeout expires return false, otherwise raise an exception.

	We implement the wait as a series of short (250 ms) blocking calls to amqp_consume_message() because this function does a blocking poll()
	call which completely blocks the VM while its waiting. To make it even worse, the rabbitmq code restarts the poll() call on
	EINTR, which means soft and hard breaks will not break the sleep."

	| args |
	aGsAmqpEnvelope clearForReuse.
	args := Array with: aGsAmqpEnvelope with:  self replyObject.
	^ self performRestlessPollOp: #primConsumeMessageInto:replyObject:timeStruct: withArguments: args forTimeoutMs: ms
%
category: 'Exchanges'
method: GsAmqpConnection
declareExchangeNamed: exchange channel: channelArg type: type durable: durable autoDelete: autoDelete

	^self
		declareExchangeNamed: exchange
		channel: channelArg
		type: type
		durable: durable
		autoDelete: autoDelete
		arguments: GsAmqpTable emptyTable
%
category: 'Exchanges'
method: GsAmqpConnection
declareExchangeNamed: exchange channel: channelArg type: type durable: durable autoDelete: autoDelete arguments: args
	self validateOpenChannelId: channelArg; validateConnection.
	self library
		amqp_exchange_declare_: self connection
		_: channelArg
		_: (GsAmqpBytes fromString: exchange)
		_: (GsAmqpBytes fromString: type)
		_: 0 "passive"
		_: durable asBit
		_: autoDelete asBit
		_: 0 "internal"
		_: args .
	^self getRpcReplyForOperation: 'amqp_exchange_declare'
%
category: 'Queues'
method: GsAmqpConnection
declareQueueWithName: name channel: channelId durable: durable exclusive: exclusive autoDelete: autoDelete passive: passive
	"name may be nil or an empty string in which case a name will be assigned by the broker"

	| result |
	self validateOpenChannelId: channelId ; validateConnection.
	result := self library
				amqp_queue_declare_: self connection
				_: channelId
				_: (GsAmqpBytes fromString: name)
				_: passive asBit
				_: durable asBit
				_: exclusive asBit
				_: autoDelete asBit
				_: GsAmqpTable emptyTable.	"passive"
	self getRpcReplyForOperation: 'amqp_queue_declare'.
	^GsAmqpQueueDeclareResult fromCPointer: result
%
category: 'Exchanges'
method: GsAmqpConnection
deleteExchangeNamed: exchange channel: channelArg forceIfInUse: forceIfInUse
	self validateOpenChannelId: channelArg; validateConnection.
	self library
		amqp_exchange_delete_: self connection
		_: channelArg
		_: (GsAmqpBytes fromString: exchange)
		_: forceIfInUse not asBit .
	^ self getRpcReplyForOperation: 'amqp_exchange_delete'.

%
category: 'Queues'
method: GsAmqpConnection
deleteQueueWithName: name channel: channelId forceIfInUse: forceIfInUse forceIfNotEmpty:  forceIfNotEmpty
	"Attempts to delete the named queue. Answers the number of messages remaining in the queue on success.
	All consumers are unbound and all pending messages are dead-lettered. Answers the number of messages that were in the queue on success.
	If forceIfInUse true, the queue is deleted even if it still has consumers. If forceIfInUse is false, the queue is only deleted if it has no consumers, otherwise an exception is raised.
	If forceIfNotEmpty true, the queue is deleted even if it is not empty. If forceIfNotEmpty is false, the queue is only deleted if it is empty, otherwise an exception is raised."

	| ptrResult |
	self validateOpenChannelId: channelId; validateConnection.
	ptrResult := self library
				amqp_queue_delete_: self connection
				_: channelId
				_: (GsAmqpBytes fromString: name)
				_: forceIfInUse not asBit
				_: forceIfNotEmpty not asBit.
	self getRpcReplyForOperation: 'amqp_queue_delete'.
	"Result is a ptr to a struct with only 1 uint32 member"
	^self pointerToInt32: ptrResult
%
category: 'Publishing'
method: GsAmqpConnection
enablePublisherConfirmsForChannel: channelId

self validateOpenChannelId: channelId  ; validateConnection.
self library amqp_confirm_select_: self connection _: channelId .
^ self getRpcReplyForOperation: 'amqp_confirm_select'.
%
category: 'Exchanges'
method: GsAmqpConnection
forceDeleteExchangeNamed: exchange channel: channelArg

	^self deleteExchangeNamed: exchange channel: channelArg forceIfInUse: true
%
category: 'Queues'
method: GsAmqpConnection
forceDeleteQueueWithName: name channel: channelId

	^self
		deleteQueueWithName: name
		channel: channelId
		forceIfInUse: true
		forceIfNotEmpty: true
%
category: 'Frames'
method: GsAmqpConnection
getFrameInto: dest withTimeoutMs: ms

| result |
result := self performRestlessPollOp: #primGetFrameInto:timeStruct: withArguments: { dest } forTimeoutMs: ms.
result == true ifTrue:[ dest initializeFromC ].
^ result
%
category: 'Frames'
method: GsAmqpConnection
getFrameInto: dest withTimeoutMs: ms errorOnTimeout: bool

	| result |
	result := self
				performRestlessPollOp: #primGetFrameInto:timeStruct:
				withArguments: {dest}
				forTimeoutMs: ms.
	result
		ifTrue: [dest initializeFromC]
		ifFalse:
			[bool
				ifTrue:
					[GsRabbitMqError signal: 'timeout waiting for a frame after ' , ms asString , ' ms']].
	^result
%
category: 'Private'
method: GsAmqpConnection
getRpcReplyForOperation: aString


	| reply |
	reply := self replyObject clearForReuse .
	self validateConnection.
	self library amqp_get_rpc_reply_: reply _: self connection.
	reply initializeFromC .
	^ reply isSuccess
		ifTrue:[ self ]
		ifFalse:[ reply raiseExceptionForOperation:  aString ]
%
category: 'Testing'
method: GsAmqpConnection
hasDataInBuffer

self validateConnection.
^ 0 ~~ (self library amqp_data_in_buffer_: self connection)
%
category: 'Testing'
method: GsAmqpConnection
hasDataReady

^ self hasDataInBuffer or:[ self hasFramesEnqueued ]
%
category: 'Testing'
method: GsAmqpConnection
hasFramesEnqueued

self validateConnection.
^ 0 ~~ (self library amqp_frames_enqueued_: self connection)
%
category: 'Channels'
method: GsAmqpConnection
hasOpenChannelWithId: anInt

^ (self openChannels at: anInt) ~~ nil
%
category: 'Accessing'
method: GsAmqpConnection
highestOpenChannel
	^highestOpenChannel
%
category: 'Updating'
method: GsAmqpConnection
highestOpenChannel: newValue
	highestOpenChannel := newValue
%
category: 'Accessing'
method: GsAmqpConnection
host
	^host
%
category: 'Updating'
method: GsAmqpConnection
host: newValue
	host := newValue
%
category: 'Initialization'
method: GsAmqpConnection
initialize

^ self library: GsLibRabbitMq new ;
	connection: library amqp_new_connection ;
	socket: self newSocket ;
	replyObject: (GsAmqpRpcReply newWithConnection: self) ;
	openChannels: (Array new: self class maxChannels) ;
	highestOpenChannel: 0 ;
	setNotLoggedIn ;
	yourself
%
category: 'Testing'
method: GsAmqpConnection
isLoggedIn

^ self loggedIn
%
category: 'Accessing'
method: GsAmqpConnection
library
	^library
%
category: 'Updating'
method: GsAmqpConnection
library: newValue
	library := newValue
%
category: 'Accessing'
method: GsAmqpConnection
loggedIn
	^loggedIn
%
category: 'Updating'
method: GsAmqpConnection
loggedIn: newValue
	loggedIn := newValue
%
category: 'Login'
method: GsAmqpConnection
loginWithUserId: uid password: pw timeoutMs: anInt

	^self
		setSocketOptions ;
		_connectWithTimeoutMs: anInt;
		_loginWithUserId: uid password: pw
%
category: 'Transactions'
method: GsAmqpConnection
makeChannelTransactional: channelId

self validateOpenChannelId: channelId ; validateConnection.
 self library amqp_tx_select_: self connection _: channelId.
^ self getRpcReplyForOperation: 'amqp_tx_select'.
%
category: 'Memory Management'
method: GsAmqpConnection
maybeReleaseBuffers

	self validateConnection.
	self library amqp_maybe_release_buffers_: self connection.
	^self
%
category: 'Testing'
method: GsAmqpConnection
methodNumberHasContent: anInt

^ 0 ~~ (self library amqp_method_has_content_: anInt)
%
category: 'Message Acknowlegement'
method: GsAmqpConnection
nackMessageWithDeliveryTag: tag channel: channel multiple: bool requeue: requeueBool

	| rc |
	self validateOpenChannelId: channel; validateConnection.
	rc := self library
				amqp_basic_nack_: self connection
				_: channel
				_: tag
				_: bool asBit
				_: requeueBool asBit.
	self getRpcReplyForOperation: 'amqp_basic_nack'.
	^rc == 0
		ifTrue: [self]
		ifFalse: [GsRabbitMqError signalWithErrorCode: rc library: self library]
%
category: 'Initialization'
method: GsAmqpConnection
newSocket

	self validateConnection.
	^self library amqp_tcp_socket_new_: self connection
%
category: 'Channels'
method: GsAmqpConnection
nextChannelId

	| result |
	^(result := self openChannels indexOf: nil) == 0
		ifTrue: [self error: 'No more available channels']
		ifFalse: [result]
%
category: 'Testing'
method: GsAmqpConnection
notLoggedIn

^ self loggedIn not
%
category: 'Accessing'
method: GsAmqpConnection
openChannels
	^openChannels
%
category: 'Updating'
method: GsAmqpConnection
openChannels: newValue
	openChannels := newValue
%
category: 'Channels'
method: GsAmqpConnection
openChannelWithId: anInt

	self validateNewChannelId: anInt ; validateConnection.
	self library amqp_channel_open_: self connection _: anInt .
	^self
		getRpcReplyForOperation: 'amqp_channel_open' ;
		addOpenChannelWithId: anInt;
		yourself
%
category: 'Channels'
method: GsAmqpConnection
openNextChannel

| result |
self openChannelWithId:  (result := self nextChannelId).
^ result
%
category: 'Restless Polling'
method: GsAmqpConnection
performRestlessPollOp: aSymbol withArguments: args forTimeoutMs: ms
	"We use this to poll for a response from the broker while blocking for no more than 250 ms.
RabbitMQ does a blocking poll() call which completely blocks the VM while its waiting.
To make it even worse, rabbitmq restarts the poll() on EINTR, which means
 soft and hard breaks will not break out of the sleep!

aSymbol - instance method selector for this class which makes the FFI call that blocks. Must take a struct timeval as the last argument (passed as a CByteArray)
args - all arguments needed for the above method EXCEPT the struct timeVal, which is provided by this method.
ms - maximum number of milliseconds to wait before giving up.

Return values:
	true - operation succeeded
	false - operation timed out
On error, a GsRabbitMqError is signaled.
"

	| timeStruct timeStructFinal array repeatCount performArgs |
	array := self library class createTimeStructArrayForMs: ms.
	timeStruct := array at: 1.	"struct timeval for 250 ms"
	repeatCount := array at: 2.	"number of 250 ms sleeps to do"
	timeStructFinal := array at: 3.	"struct timeval for the final sleep, or 0 for no final sleep"
	performArgs := (args copy) "Add the timeStruct to the arg array"
				add: timeStruct;
				yourself.
	1 to: repeatCount
		do:
			[:n |
			| result |
			result := self perform: aSymbol withArguments: performArgs.
			result == false ifFalse: [^result]	"We got a message or raised an exception"].
	^timeStructFinal == 0
		ifTrue: [false	"no final poll, so we timed out with no messages received"]
		ifFalse:
			[performArgs := (args copy)
						add: timeStructFinal;
						yourself. "Add the final time struct to the arg array"
			self perform: aSymbol withArguments: performArgs	"do the final poll and answer the result of it"]
%
category: 'Private'
method: GsAmqpConnection
pointerToInt32: aCPointer

	^(CByteArray fromCPointer: aCPointer numBytes: 4) uint32At: 0
%
category: 'Publishing'
method: GsAmqpConnection
pollForPublishConfirmOnChannel: channelId waitUpTo: waitMs

	| methodFrame headerFrame bodyFrame bodySize totalBytes bodyMsg result payload |
	result := Array new.
	methodFrame := GsAmqpFrame newWithConnection: self.
	self getFrameInto: methodFrame withTimeoutMs: waitMs errorOnTimeout: true.
	methodFrame isFrameMethod ifFalse: [self error: 'expected a method frame'].
	(payload := methodFrame payload) hasContent ifFalse:[ ^ payload ].
	result add: methodFrame.
	headerFrame := GsAmqpFrame newWithConnection: self.
	self getFrameInto: headerFrame withTimeoutMs: waitMs errorOnTimeout: true.
	headerFrame isFrameHeader ifFalse: [self error: 'expected a header frame'].
	result add: headerFrame.
	bodySize := headerFrame bodySize.
	bodySize > 0
		ifTrue:
			[bodyMsg := String new.
			totalBytes := 0.
			bodyFrame := GsAmqpFrame newWithConnection: self.
			result add: bodyFrame.
			[totalBytes < bodySize]
				whileTrue:
					[self getFrameInto: bodyFrame withTimeoutMs: waitMs errorOnTimeout: true.
					bodyMsg addAll: bodyFrame payload]
							result
				add: bodyMsg].
	^result
%
category: 'Accessing'
method: GsAmqpConnection
port
	^port
%
category: 'Updating'
method: GsAmqpConnection
port: newValue
	port := newValue
%
category: 'Consuming'
method: GsAmqpConnection
primConsumeMessageInto: aGsAmqpEnvelope replyObject: reply timeStruct: ts
	"Get the next available message. Note message may be for any channel and from any queue.
	If successful, store the message in aGsAmqpEnvelopeand return true. If the timeout expires return false, otherwise raise an exception
	Note: timeStruct arg must come last."

	self validateConnection.
	reply clearForReuse.
	self library
		amqp_consume_message_: reply
		_: self connection
		_: aGsAmqpEnvelope
		_: ts
		_: 0.
	reply initializeFromC.
	^reply isSuccess
		ifTrue:
			[aGsAmqpEnvelope
				initializeFromC ;
				destroyCStateUsingLibrary: self library.
			true]
		ifFalse: [reply isTimeout ifTrue: [false] ifFalse: [reply raiseExceptionForOperation: 'amqp_consume_message' ]]
%
category: 'Frames'
method: GsAmqpConnection
primGetFrameInto: dest timeStruct: ts

	| rc |
	self validateConnection.
	rc := self library
				amqp_simple_wait_frame_noblock_: self connection
				_: dest
				_: ts.
	^rc == 0
		ifTrue: [true]
		ifFalse:
			[rc == GsAmqpRpcReply AMQP_STATUS_TIMEOUT
				ifTrue: [false]
				ifFalse: [GsRabbitMqError signalWithErrorCode: rc library: self library]]
%
category: 'Publishing'
method: GsAmqpConnection
publishMessage: msg channel: channelArg exchange: exchange routingKey: routingKey mandatory: mandatory properties: props

	| rc |
	self validateOpenChannelId: channelArg; validateConnection.
	exchange _validateClass: String.
	routingKey notNil ifTrue:[ routingKey _validateClass: String ].
	rc := self library
				amqp_basic_publish_: self connection
				_: channelArg
				_: (GsAmqpBytes fromString: exchange)
				_: (GsAmqpBytes fromString: routingKey)
				_: mandatory asBit
				_: 0 "immediate: obsolete and no longer implemented"
				_: props
				_: (GsAmqpBytes fromString: msg).
	^rc == 0
		ifTrue: [self]
		ifFalse: [GsRabbitMqError signalWithErrorCode: rc library: self library]
%
category: 'Queues'
method: GsAmqpConnection
purgeQueueWithName: name channel: channelId
	"Attempts to purge the named queue. Answers the number of messages remaining in the queue on success."

	| ptrResult |
	self validateOpenChannelId: channelId; validateConnection.
	ptrResult := self library
				amqp_queue_purge_: self connection
				_: channelId
				_: (GsAmqpBytes fromString: name).
	self getRpcReplyForOperation: 'amqp_queue_purge'.
	"Result is a ptr to a struct with only 1 uint32 member"
	^self pointerToInt32: ptrResult
%
category: 'Errors'
method: GsAmqpConnection
raiseInvalidConnectionError

^ GsRabbitMqError signal: 'Illegal operation on an invalid connection'
%
category: 'Errors'
method: GsAmqpConnection
raiseInvalidSocketError

^ GsRabbitMqError signal: 'Illegal operation on an invalid socket'
%
category: 'Queues - Private'
method: GsAmqpConnection
readMessageInto: gsAmqpMsg channel: channelId

	| reply msg |
	self validateOpenChannelId: channelId; validateConnection.
	msg := gsAmqpMsg ifNil: [GsAmqpMessage new] ifNotNil: [gsAmqpMsg].
	reply := self replyObject clearForReuse.
	self library
		amqp_read_message_: reply
		_: self connection
		_: channelId
		_: msg
		_: 0.
	reply initializeFromC.
	^reply isSuccess
		ifTrue:
			[msg
				initializeFromC;
				destroyCStateUsingLibrary: self library]
		ifFalse: [reply raiseExceptionForOperation: 'amqp_read_message' ]
%
category: 'Initialization'
method: GsAmqpConnection
reinitializeAfterLoginFailure

^ self _destroyConnection ;
	connection: (self library amqp_new_connection) ;
	socket: self newSocket ;
	setNotLoggedIn ;
	yourself
%
category: 'Message Acknowlegement'
method: GsAmqpConnection
rejectMessageWithDeliveryTag: tag channel: channel requeue: requeueBool

	| rc |
	self validateOpenChannelId: channel; validateConnection.
	rc := self library
				amqp_basic_reject_: self connection
				_: channel
				_: tag
				_: requeueBool asBit.
	self getRpcReplyForOperation: 'amqp_basic_reject'.
	^rc == 0
		ifTrue: [self]
		ifFalse: [GsRabbitMqError signalWithErrorCode: rc library: self library]
%
category: 'Channels'
method: GsAmqpConnection
removeOpenChannelWithId: anInt

self openChannels at: anInt put: nil .
^ self
%
category: 'Accessing'
method: GsAmqpConnection
replyObject
	^replyObject
%
category: 'Updating'
method: GsAmqpConnection
replyObject: newValue
	replyObject := newValue
%
category: 'Transactions'
method: GsAmqpConnection
rollbackTransactionOnChannel: channelId

self validateOpenChannelId: channelId ; validateConnection.
self library amqp_tx_rollback_: self connection _: channelId.
^ self getRpcReplyForOperation: 'amqp_tx_rollback'.
%
category: 'Private'
method: GsAmqpConnection
setConnected

^ self connected: true ; yourself
%
category: 'Private'
method: GsAmqpConnection
setLoggedIn

^ self loggedIn: true ; yourself
%
category: 'Private'
method: GsAmqpConnection
setNotLoggedIn

^ self loggedIn: false ; yourself
%
category: 'Private'
method: GsAmqpConnection
setSocketOptions

"Nothing to do"

^ self
%
category: 'Queues'
method: GsAmqpConnection
sizeOfQueueWithName: name channel: channelId


	| result |
	self validateOpenChannelId: channelId ; validateConnection.
	result := self library
				amqp_queue_declare_: self connection
				_: channelId
				_: (GsAmqpBytes fromString: name)
				_: 1 "passive"
				_: 0 "ignored"
				_: 0 "ignored"
				_: 0 "ignored"
				_: GsAmqpTable emptyTable.
	self getRpcReplyForOperation: 'amqp_queue_declare'.
	^ (GsAmqpQueueDeclareResult fromCPointer: result) messageCount
%
category: 'Accessing'
method: GsAmqpConnection
socket
	^socket
%
category: 'Updating'
method: GsAmqpConnection
socket: newValue
	socket := newValue
%
category: 'Queues'
method: GsAmqpConnection
stopConsumingQueueOnChannel: channelId consumerTag: consumerTag
	"Reverses a previous call to #beginConsumingQueueWithName. Tells the broker we will no longer be consuming a queue. Returns a string containing the canceled consumer tag on success."

	| result |
	self validateOpenChannelId: channelId ; validateConnection.
	result := self library
				amqp_basic_cancel_: self connection
				_: channelId
				_: (GsAmqpBytes fromString: consumerTag).
	self getRpcReplyForOperation: 'amqp_basic_cancel'.
	^( GsAmqpBytes fromCPointer: result) convertToString
%
category: 'Exchanges'
method: GsAmqpConnection
unbindExchangeNamed: srcExchange from: destExchange channel: channelArg routingKey: routingKey
	self validateOpenChannelId: channelArg; validateConnection.
	self library
		amqp_exchange_unbind_: self connection
		_: channelArg
		_: (GsAmqpBytes fromString: destExchange)
		_: (GsAmqpBytes fromString: srcExchange)
		_: (GsAmqpBytes fromString: routingKey)
		_: GsAmqpTable emptyTable.
	^ self getRpcReplyForOperation: 'amqp_exchange_unbind'.
%
category: 'Queues'
method: GsAmqpConnection
unbindQueueWithName: name fromExchangeWithName: exchange channel: channelId routingKey: routingKey
	"Attempts to unbind the named queue from exchange named exchange. Answers the receiver on success."

	^self
		unbindQueueWithName: name
		fromExchangeWithName: exchange
		channel: channelId
		routingKey: routingKey
		arguments: GsAmqpTable emptyTable
%
category: 'Queues'
method: GsAmqpConnection
unbindQueueWithName: name fromExchangeWithName: exchange channel: channelId routingKey: routingKey arguments: args
	"Attempts to unbind the named queue from the exchange named exchange. Answers the receiver on success."

	self validateOpenChannelId: channelId; validateConnection.
	self library
		amqp_queue_bind_: self connection
		_: channelId
		_: (GsAmqpBytes fromString: name)
		_: (GsAmqpBytes fromString: exchange)
		_: (GsAmqpBytes fromString: routingKey)
		_: args .
	^self getRpcReplyForOperation: 'amqp_queue_unbind'
%
category: 'Validation'
method: GsAmqpConnection
validateConnection

self connection ifNil:[ self raiseInvalidConnectionError ].
^ self
%
category: 'Validation'
method: GsAmqpConnection
validateNewChannelId: anInt
	"Channel ID must in range of uint16_t"

	anInt
		_validateClass: SmallInteger;
		_validateMin: 1 max: self class maxChannels .
	^(self hasOpenChannelWithId: anInt)
		ifTrue:
			[GsRabbitMqError
				signal: 'Attempt to open channel which is already open (' , anInt asString
						, ')']
		ifFalse: [self]
%
category: 'Validation'
method: GsAmqpConnection
validateOpenChannelId: anInt
	"Channel ID must in range of uint16_t"

	anInt
		_validateClass: SmallInteger;
		_validateMin: 1 max: self class maxChannels.
	^(self hasOpenChannelWithId: anInt)
		ifTrue: [self]
		ifFalse:
			[GsRabbitMqError
				signal: 'Attempt to use channel which is not open (' , anInt asString , ')']
%
category: 'Validation'
method: GsAmqpConnection
validateSocket

self socket ifNil:[ self raiseInvalidSocketError ].
^ self
%
category: 'Private'
method: GsAmqpConnection
_closeConnection

	| conn |
	(conn := self connection)
		ifNil: [GsRabbitMqError signal: 'Connection already closed']
		ifNotNil:
			[
			[| reply |
			self closeAllChannels.
			reply := self replyObject clearForReuse.
			self library
				amqp_connection_close_: reply
				_: conn
				_: self library class AMQP_REPLY_SUCCESS.
			reply initializeFromC.
			reply isSuccess
				ifFalse: [^reply raiseExceptionForOperation: 'amqp_connection_close']]
					ensure: [self socket: nil ; setNotLoggedIn ]].
	^self
%
category: 'Private'
method: GsAmqpConnection
_connectWithTimeoutMs: anInt

| rc timeStruct |
timeStruct := self library class createStructTimeValForMilliseconds: anInt .
rc := self library amqp_socket_open_noblock_: self socket _: self host _: self port _: timeStruct .
^ rc == 0
	ifTrue:[ self ]
	ifFalse:[ GsRabbitMqError signalWithErrorCode: rc library: self library ]
%
category: 'Private'
method: GsAmqpConnection
_destroyConnection

	| conn |
	(conn := self connection)
		ifNil: [GsRabbitMqError signal: 'Connection already destroyed']
		ifNotNil:
			[[self library amqp_destroy_connection_: conn]
				ensure: [self connection: nil]].
	^self
%
category: 'Private'
method: GsAmqpConnection
_loginWithUserId: uid password: pw

	| reply |
	self validateConnection.
"Prevent SEGV in rabbitmq library"
	uid _validateClass: String.
	pw _validateClass: String.
	reply := self replyObject clearForReuse .
	self library amqp_login_: reply _: self connection _: '/' _: 0 _: 131072 _: 0 _: 0 varArgs: { #'const char*' . uid . #'const char*' . pw } .
	reply initializeFromC .
	^ reply isSuccess
		ifTrue:[ self setLoggedIn ]
		ifFalse:[ self reinitializeAfterLoginFailure . reply raiseExceptionForOperation: 'amqp_login']
%
! ------------------- Remove existing behavior from GsAmqpEntity
removeAllMethods GsAmqpEntity
removeAllClassMethods GsAmqpEntity
! ------------------- Class methods for GsAmqpEntity
! ------------------- Instance methods for GsAmqpEntity
category: 'Accessing'
method: GsAmqpEntity
autoDelete
	^autoDelete
%
category: 'Updating'
method: GsAmqpEntity
autoDelete: newValue
	autoDelete := newValue
%
category: 'Accessing'
method: GsAmqpEntity
channel
	^channel
%
category: 'Updating'
method: GsAmqpEntity
channel: newValue
	channel := newValue
%
category: 'Accessing'
method: GsAmqpEntity
connection
	^connection
%
category: 'Updating'
method: GsAmqpEntity
connection: newValue
	connection := newValue
%
category: 'Accessing'
method: GsAmqpEntity
durable
	^durable
%
category: 'Updating'
method: GsAmqpEntity
durable: newValue
	durable := newValue
%
category: 'Accessing'
method: GsAmqpEntity
name
	^name
%
category: 'Updating'
method: GsAmqpEntity
name: newValue
	name := newValue
%
! ------------------- Remove existing behavior from GsAmqpCStruct
removeAllMethods GsAmqpCStruct
removeAllClassMethods GsAmqpCStruct
! ------------------- Class methods for GsAmqpCStruct
category: 'Instance Creation'
classmethod: GsAmqpCStruct
fromCPointer: aCPointer

"NOT auto freed"
^ self fromCPointer: aCPointer atOffset: 0 initializeFromC: true
%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
fromCPointer: aCByteArray atOffset: offset

"NOT auto freed"


^ self fromCPointer: aCByteArray atOffset: offset initializeFromC: true


%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
fromCPointer: aCByteArray atOffset: offset initializeFromC: doInitFromC

"NOT auto freed"

	| res |
	res := self on: aCByteArray atOffset: offset .
	doInitFromC ifTrue: [res initializeFromC].
	^res
%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
fromMemoryReferenceIn: aCByteArray atOffset: offset

	^self
		fromMemoryReferenceIn: aCByteArray
		atOffset: offset
		initializeFromC: true
%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
fromMemoryReferenceIn: aCByteArray atOffset: offset initializeFromC: doInitFromC

	^self
		fromMemoryReferenceIn: aCByteArray
		atOffset: offset
		sizeInBytes: self sizeInC
		initializeFromC: doInitFromC
%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
fromMemoryReferenceIn: aCByteArray atOffset: offset sizeInBytes: bytes

	^self
		fromMemoryReferenceIn: aCByteArray
		atOffset: offset
		sizeInBytes: bytes
		initializeFromC: true
%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
fromMemoryReferenceIn: aCByteArray atOffset: offset sizeInBytes: bytes initializeFromC: doInitFromC


"NOT auto freed"

	| res cPointer |

	cPointer := CPointer forAddress: (aCByteArray uint64At: offset).
	res := self fromCPointer: cPointer numBytes: bytes.
	doInitFromC ifTrue: [res initializeFromC].
	^res
%
category: 'Constants'
classmethod: GsAmqpCStruct
lastZeroBasedOffset

^self sizeInC - 1
%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
new

| result |
result := self gcMalloc: self sizeInC.
result initialize.
^ result
%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
new: aSize

"Use new instead "
^ self shouldNotImplement: #new:
%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
on: aCByteArray

	^self on: aCByteArray atOffset: 0
%
category: 'Instance Creation'
classmethod: GsAmqpCStruct
on: aCByteArray atOffset: offset

	| res |
	res := self
				fromRegionOf: aCByteArray
				offset: offset
				numBytes: self sizeInC.
	^ res initialize ;
		derivedFrom: aCByteArray;
	yourself
%
category: 'Subclass Methods'
classmethod: GsAmqpCStruct
sizeInC

^self subclassResponsibility: #sizeInC
%
! ------------------- Instance methods for GsAmqpCStruct
category: 'Accessing Memory'
method: GsAmqpCStruct
booleanAtOffset: anOffset

"C memory of receiver at offset anOffset contains 32-bit 0x1 or 0x0. Translate to a Smalltalk true  or false"

^ 0 ~~ (self uint32At: anOffset)
%
category: 'Accessing Strings'
method: GsAmqpCStruct
byteArrayFromAmqpBytesAtOffset: anOffset

"Receiver contains a amqp_bytes_t struct at offset anOffset. Return a ByteArray containing the bytes that it holds."

	| size |
	^(size := self getSizeOfAmqpBytesAtOffset: anOffset)
		ifNil: [nil]
		ifNotNil: [self byteArrayFromCharStarAt: anOffset + 8 numBytes: size]
%
category: 'Accessing Strings'
method: GsAmqpCStruct
byteObjectFromAmqpBytesAtOffset: anOffset class: aByteClass
	"Receiver contains a amqp_bytes_t struct at offset anOffset. Return the string that it holds."

	^ (aByteClass isSubclassOf: String)
		ifTrue: [self stringFromAmqpBytesAtOffset: anOffset]
		ifFalse:
			[(aByteClass isSubclassOf: ByteArray)
				ifTrue: [self byteArrayFromAmqpBytesAtOffset: anOffset]
				ifFalse: [self error: 'Unexpected byte class']]
%
category: 'Updating'
method: GsAmqpCStruct
clearAmqpBytesAtOffset: offset

	^self
		uint64At: offset put: 0; "length"
		uint64At: (offset + 8) put: 0 ; "char *"
		yourself
%
category: 'Accessing Memory'
method: GsAmqpCStruct
cPointerForOffset: offset

^CPointer _allocate _initFrom: self offset: offset
%
category: 'Accessing Strings'
method: GsAmqpCStruct
getSizeOfAmqpBytesAtOffset: anOffset

	| size |
	size := self uint64At: anOffset.
	^size == 0
		ifTrue: [nil]
		ifFalse:
			[size > 16r20000
				ifTrue:
					[self
						error: 'ByteArray larger than 128K detected. Possible bad memory reference']
				ifFalse: [size]]
%
category: 'Subclass Methods'
method: GsAmqpCStruct
initializeFromC

"Subclasses may overload this method to initialize instance variables from C state at instance creation time."

^ self
%
category: 'Updating'
method: GsAmqpCStruct
storeAmqpBytes: amqpBytes atOffset: offset

	^self
		uint64At: offset put: amqpBytes len;
		uint64At: (offset + 8) put: amqpBytes bytesAddress;
		yourself
%
category: 'Accessing Strings'
method: GsAmqpCStruct
stringFromAmqpBytesAtOffset: anOffset
	"Receiver contains a amqp_bytes_t struct at offset anOffset. Return the string that it holds."

	| size |
	^(size := self getSizeOfAmqpBytesAtOffset: anOffset)
		ifNil: [nil]
		ifNotNil: [self stringFromCharStarAt: anOffset + 8 numBytes: size]
%
category: 'Accessing Strings'
method: GsAmqpCStruct
utf16FromAmqpBytesAtOffset: anOffset

"Receiver contains a amqp_bytes_t struct at offset anOffset. Return a Utf8 containing the bytes that it holds."

	| size |
	^(size := self getSizeOfAmqpBytesAtOffset: anOffset)
		ifNil: [nil]
		ifNotNil: [self utf16FromCharStarAt: anOffset + 8 numBytes: size]
%
category: 'Accessing Strings'
method: GsAmqpCStruct
utf8FromAmqpBytesAtOffset: anOffset

"Receiver contains a amqp_bytes_t struct at offset anOffset. Return a Utf8 containing the bytes that it holds."

	| size |
	^(size := self getSizeOfAmqpBytesAtOffset: anOffset)
		ifNil: [nil]
		ifNotNil: [self utf8FromCharStarAt: anOffset + 8 numBytes: size]
%
category: 'Updating'
method: GsAmqpCStruct
zeroMemory

	^self
		memset: 0 from: 0 to: -1;
		yourself
%
! ------------------- Remove existing behavior from GsAmqpExample
removeAllMethods GsAmqpExample
removeAllClassMethods GsAmqpExample
! ------------------- Class methods for GsAmqpExample
category: 'Accessing'
classmethod: GsAmqpExample
amqpUserId

^ amqpUserId ifNil:[ self defaultUserId ] ifNotNil:[ amqpUserId ]
%
category: 'Updating'
classmethod: GsAmqpExample
amqpUserId: newValue

amqpUserId := newValue
%
category: 'Accessing'
classmethod: GsAmqpExample
badMessages

^ badMessages
%
category: 'Accessing'
classmethod: GsAmqpExample
caCertPath

^ caCertPath ifNil:[ self error: 'caCertPath has not been set' ] ifNotNil:[ caCertPath ]
%
category: 'Updating'
classmethod: GsAmqpExample
caCertPath: newValue

caCertPath := newValue
%
category: 'Accessing'
classmethod: GsAmqpExample
certPath

^ certPath ifNil:[ self error: 'certPath has not been set' ] ifNotNil:[ certPath ]
%
category: 'Updating'
classmethod: GsAmqpExample
certPath: newValue

certPath := newValue
%
category: 'Example 99 (Perf Test)'
classmethod: GsAmqpExample
committerSharedCounterId

^ 1
%
category: 'Example 99 (Perf Test)'
classmethod: GsAmqpExample
committerShouldRun

^ 0 ~~ (System sharedCounter: self committerSharedCounterId)
%
category: 'Producer - Consumer Coordination'
classmethod: GsAmqpExample
consumerIsReady: exampleNum

^ exampleNum == (System sharedCounter: self sharedCounterId)
%
category: 'Accessing'
classmethod: GsAmqpExample
debugEnabled

^ debugEnabled
%
category: 'Updating'
classmethod: GsAmqpExample
debugEnabled: bool

debugEnabled := bool
%
category: 'Default Credentials'
classmethod: GsAmqpExample
defaultHostName

	^ 'localhost'
%
category: 'Default Credentials'
classmethod: GsAmqpExample
defaultLoginTimeoutMs

^ 10000 "milliseconds = 10 seconds"
%
category: 'Default Credentials'
classmethod: GsAmqpExample
defaultPassword

^ 'guest'
%
category: 'Default Credentials'
classmethod: GsAmqpExample
defaultPort

	^ GsAmqpConnection defaultPort
%
category: 'Default TLS Credentials'
classmethod: GsAmqpExample
defaultPrivateKeyPassphrase

"Default is no passphrase for private key."
^ nil
%
category: 'Default TLS Credentials'
classmethod: GsAmqpExample
defaultTlsPort

	^ GsAmqpTlsConnection defaultPort
%
category: 'Default Credentials'
classmethod: GsAmqpExample
defaultUserId

^ 'guest'
%
category: 'Accessing'
classmethod: GsAmqpExample
directExchangeName

^ self exchangeNameForKind: 'direct'
%
category: 'Debugging'
classmethod: GsAmqpExample
disableDebug

self debugEnabled: false
%
category: 'Debugging'
classmethod: GsAmqpExample
enableDebug

self debugEnabled: true
%
category: 'Example 12 (Binary Messages)'
classmethod: GsAmqpExample
encryptionKey

^ ByteArray fromBase64String:  'LEz75mdIdskvShY0PidDNwQjvVSAXThoal5QBS0gD+I='.
%
category: 'Example 12 (Binary Messages)'
classmethod: GsAmqpExample
encryptionSalt

^ ByteArray fromBase64String:  '80Yay6FJ7V6EQYiJZz6u8Q=='
%
category: 'Accessing'
classmethod: GsAmqpExample
exchangeNameForKind: aString

^ aString, '.exchange.', self randomShortString
%
category: 'Accessing'
classmethod: GsAmqpExample
fanoutExchangeName

^ self exchangeNameForKind: 'fanout'
%
category: 'Default Connections'
classmethod: GsAmqpExample
getConnection: useTls

^ useTls ifTrue:[ self newTlsConnection ] ifFalse:[ self newConnection ]
%
category: 'Accessing'
classmethod: GsAmqpExample
headersExchangeName

^ self exchangeNameForKind: 'headers'
%
category: 'Accessing'
classmethod: GsAmqpExample
hostname

^ hostname ifNil:[ self defaultHostName ] ifNotNil:[ hostname ]
%
category: 'Updating'
classmethod: GsAmqpExample
hostname: newValue

hostname := newValue
%
category: 'Initialization'
classmethod: GsAmqpExample
initialize

debugEnabled := false.
randomString := self newRandomString.
messages := Array new.
self numberOfMessages timesRepeat:[ messages add: self newRandomString].
badMessages := Array new.
messages do:[:msg| badMessages add: ('BadMessage.', msg)].
^ self
%
category: 'Accessing'
classmethod: GsAmqpExample
loginTimeoutMs

^ loginTimeoutMs ifNil:[ self defaultLoginTimeoutMs ] ifNotNil:[ loginTimeoutMs ]
%
category: 'Updating'
classmethod: GsAmqpExample
loginTimeoutMs: newValue

loginTimeoutMs := newValue
%
category: 'Example 99 (Perf Test)'
classmethod: GsAmqpExample
makeCommitRecords

	| sys ug dt |
	(sys := System) _cacheName: 'Committer'.
	ug := UserGlobals.
	dt := DateTime.

	[
		[self committerShouldRun] whileTrue:
			[ug at: #foo put: dt now.
			sys
				commitTransaction;
				_sleepMs: 250]]
			ensure:
				[ug removeKey: #foo ifAbsent: [].
				sys commitTransaction].
	^true
%
category: 'Accessing'
classmethod: GsAmqpExample
messages

^ messages
%
category: 'Default Connections'
classmethod: GsAmqpExample
newConnection

	^self
		newConnectionToHost: self hostname
		port: self port
		userId: self amqpUserId
		password: self password
%
category: 'Default Connections'
classmethod: GsAmqpExample
newConnectionToHost: hostname port: port userId: uid password: pw

^ self newConnectionToHost: hostname port: port userId: uid password: pw timeoutMs: self loginTimeoutMs
%
category: 'Default Connections'
classmethod: GsAmqpExample
newConnectionToHost: hostname port: port userId: uid password: pw timeoutMs: timeoutMs

	^(GsAmqpConnection newOnHost: hostname port: port)
		loginWithUserId: uid
		password: pw
		timeoutMs: timeoutMs
%
category: 'Initialization'
classmethod: GsAmqpExample
newRandomString

^ (ByteArray withRandomBytes: 48) asBase64String
%
category: 'Default TLS Connections'
classmethod: GsAmqpExample
newTlsConnection

	^self
		newTlsConnectionToHost: self hostname
		port: self tlsPort
		userId: self amqpUserId
		password: self password
		caCertPath: self caCertPath
		certPath: self certPath
		keyPath: self privateKey
		keyPassphrase: self privateKeyPassphrase
		timeoutMs: self loginTimeoutMs
%
category: 'Default TLS Connections'
classmethod: GsAmqpExample
newTlsConnectionToHost: hostname port: port userId: uid password: password caCertPath: caCertPath certPath: certPath keyPath: keyPath keyPassphrase: passphrase timeoutMs: timeoutMs

	^(GsAmqpTlsConnection
		newOnHost: hostname
		port: port
		caCertPath: caCertPath
		certPath: certPath
		keyPath: keyPath
		keyPassphrase: passphrase)
			loginWithUserId: uid
			password: password
			timeoutMs: timeoutMs
%
category: 'Constants'
classmethod: GsAmqpExample
numberOfMessages

^ 64
%
category: 'Constants'
classmethod: GsAmqpExample
numExamples

^ 12
%
category: 'Example 99 (Perf Test)'
classmethod: GsAmqpExample
numMessagesForPerformanceTest

^ 500000
%
category: 'Accessing'
classmethod: GsAmqpExample
password

^ password ifNil:[ self defaultPassword] ifNotNil:[ password ]
%
category: 'Updating'
classmethod: GsAmqpExample
password: newValue

password := newValue
%
category: 'Accessing'
classmethod: GsAmqpExample
port

^ port ifNil:[ self defaultPort ] ifNotNil:[ port ]
%
category: 'Updating'
classmethod: GsAmqpExample
port: newValue

port := newValue
%
category: 'Accessing'
classmethod: GsAmqpExample
privateKey

^ privateKey ifNil:[ self error: 'private key has not been set' ] ifNotNil:[ privateKey ]
%
category: 'Updating'
classmethod: GsAmqpExample
privateKey: newValue

privateKey := newValue
%
category: 'Accessing'
classmethod: GsAmqpExample
privateKeyPassphrase

^ privateKeyPassphrase ifNil:[ self defaultPrivateKeyPassphrase  ] ifNotNil:[ privateKeyPassphrase ]
%
category: 'Updating'
classmethod: GsAmqpExample
privateKeyPassphrase: newValue

privateKeyPassphrase := newValue
%
category: 'Accessing'
classmethod: GsAmqpExample
randomShortString

^ randomString copy size: 12
%
category: 'Accessing'
classmethod: GsAmqpExample
randomString

^ randomString
%
category: 'Accessing'
classmethod: GsAmqpExample
routingKey

^ 'RoutingKey.', self randomShortString
%
category: 'Example 10 (Acknowlegements 2)'
classmethod: GsAmqpExample
runConsumerExample10UseTls: useTls

"Example of a simple queue consumer using the built-in direct exchange using bulk acknowlegments for all messages received.
Start the consumer first, then start the producer."

	| conn routingKey queue env count exchgName chan results numExpected debug exampleNum|
	exampleNum := 10.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	numExpected := self numberOfMessages .
	results := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchgName := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: true.
	debug ifTrue:[GsFile gciLogServer: 'Queue name is ' , queue name].
"Bind our queue to the built-in exchange"
	conn
		bindQueueWithName: queue name
		toExchangeWithName: exchgName
		channel: chan
		routingKey: routingKey.
"Tell broker we want to start consuming this queue and that we will send acknowlegements"
	queue beginConsumingWithNoLocal: false noAck: false.
	count := 0.
	env := GsAmqpEnvelope new.
	self setConsumerReady: exampleNum.
"Loop until we have received all messages"
	[count == numExpected] whileFalse:
			[(queue consumeMessageInto: env timeoutMs: 3000)
				ifTrue:
					[count := count + 1.
					results add: env messageBody.
					debug ifTrue:[GsFile gciLogServer: 'msg ' , count asString , ': ' , env messageBody]. ]
				ifFalse: [debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...']]].
"Send acknowlegement to the broker for all messages"
	queue ackEnvelopeAndAllPrevious: env.
"Tell the broker to send us no more messages"
	self setConsumerNotReady.
	queue stopConsuming.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ debug ifTrue:[GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')]].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue deleteIfSafe.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	^results = self messages
%
category: 'Example 11 (Polling with GsSocket)'
classmethod: GsAmqpExample
runConsumerExample11UseTls: useTls

"Example of a simple queue consumer using the built-in direct exchange using a GsSocket to poll the broker.
Start the consumer first, then start the producer."

	| conn routingKey queue env count exchgName chan results numExpected debug gsSock exampleNum|
	exampleNum := 11.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	numExpected := self numberOfMessages .
	results := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchgName := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Get a GsSocket representing the socket to the broker. Do not close or modify this socket!"
	gsSock := conn asGsSocket .
"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: true.
	debug ifTrue:[GsFile gciLogServer: 'Queue name is ' , queue name].
"Bind our queue to the built-in exchange"
	conn
		bindQueueWithName: queue name
		toExchangeWithName: exchgName
		channel: chan
		routingKey: routingKey.
"Tell broker we want to start consuming this queue"
	queue beginConsumingWithNoLocal: false noAck: true.
	count := 0.
	env := GsAmqpEnvelope new.
	self setConsumerReady: exampleNum.
"Loop until we have received all messages"
	[count == numExpected] whileFalse:[
"Use GsSocket methods to know when we have more data to read"
			[conn hasDataReady or:[gsSock readWillNotBlockWithin: 1000]]
				whileFalse:[ debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...' ]].
			(queue consumeMessageInto: env timeoutMs: 0)
				ifTrue:
					[count := count + 1.
					results add: env messageBody.
					debug ifTrue:[GsFile gciLogServer: 'msg ' , count asString , ': ' , env messageBody]. ]
				ifFalse: [debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...']]].
"Do not close or otherwise modify gsSock"
	gsSock := nil.
"Tell the broker to send us no more messages"
	queue stopConsuming.
	self setConsumerNotReady.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ debug ifTrue:[GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')]].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue deleteIfSafe.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	^results = self messages
%
category: 'Example 12 (Binary Messages)'
classmethod: GsAmqpExample
runConsumerExample12UseTls: useTls

"Example of a simple queue consumer using the built-in direct exchange to receive encrypted binary messages.
Start the consumer first, then start the producer."

	| conn routingKey queue env count exchgName chan results numExpected debug key salt exampleNum|
	exampleNum := 12 .
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	numExpected := self numberOfMessages .
	results := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchgName := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: true.
	debug ifTrue:[GsFile gciLogServer: 'Queue name is ' , queue name].
"Bind our queue to the built-in exchange"
	conn
		bindQueueWithName: queue name
		toExchangeWithName: exchgName
		channel: chan
		routingKey: routingKey.
"Tell broker we want to start consuming this queue"
	queue beginConsumingWithNoLocal: false noAck: true.
	count := 0.
"Get an envelope for handling binary data"
	env := GsAmqpEnvelope newForBinaryMessage.
	key := self encryptionKey.
	salt := self encryptionSalt.
	self setConsumerReady: exampleNum.
"Loop until we have received all messages"
	[count == numExpected] whileFalse:
			[(queue consumeMessageInto: env timeoutMs: 3000)
				ifTrue:
					[ | msg |
					count := count + 1.
					results add: (msg := env messageBody aesDecryptWith256BitKey: key salt: salt).
					debug ifTrue:[GsFile gciLogServer: 'msg ' , count asString , ': ' , env messageBody]. ]
				ifFalse: [debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...']]].
"Tell the broker to send us no more messages"
	queue stopConsuming.
	self setConsumerNotReady.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ debug ifTrue:[GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')]].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue deleteIfSafe.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	^results = self messages
%
category: 'Example 01 (Simple producer/consumer)'
classmethod: GsAmqpExample
runConsumerExample1UseTls: useTls

"Example of a simple queue consumer using the built-in direct exchange.
Start the consumer first, then start the producer."

^ self runSimpleConsumerExample: 1 useTls: useTls
%
category: 'Example 02 (Publisher Confirms 1)'
classmethod: GsAmqpExample
runConsumerExample2UseTls: useTls

^ self runSimpleConsumerExample: 2 useTls: useTls
%
category: 'Example 03 (Publisher Confirms 2)'
classmethod: GsAmqpExample
runConsumerExample3UseTls: useTls

^ self runSimpleConsumerExample: 3 useTls: useTls
%
category: 'Example 04 (Transactions)'
classmethod: GsAmqpExample
runConsumerExample4UseTls: useTls

^ self runSimpleConsumerExample: 4 useTls: useTls
%
category: 'Example 05 (Direct Exchange)'
classmethod: GsAmqpExample
runConsumerExample5UseTls: useTls

"Example of a simple queue consumer using newly created direct exchange.
Start the consumer first, then start the producer."

	| conn routingKey queue env count exchg exchgName chan results numExpected debug exampleNum |
	exampleNum := 5.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	numExpected := self numberOfMessages .
	results := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchgName := self directExchangeName .
"Open a channel"
	conn openChannelWithId: chan.
"Create a new direct exchange"
	conn deleteExchangeNamed: exchgName  channel: chan forceIfInUse:  true.
	exchg := GsAmqpDirectExchange declareWithConnection: conn name: exchgName channel: chan durable: false autoDelete: false .

"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: false.
	debug ifTrue:[GsFile gciLogServer: 'Queue name is ' , queue name].
"Bind the queue to our new exchange"
	queue bindToExchange: exchg routingKey: routingKey .
"Tell broker we want to start consuming this queue"
	queue beginConsumingWithNoLocal: false noAck: true.
	count := 0.
	env := GsAmqpEnvelope new.
	self setConsumerReady: exampleNum.
"Loop until we have received all messages"
	[count == numExpected] whileFalse:
			[(queue consumeMessageInto: env timeoutMs: 3000)
				ifTrue:
					[count := count + 1.
					results add: env messageBody.
					debug ifTrue:[GsFile gciLogServer: 'msg ' , count asString , ': ' , env messageBody]. ]
				ifFalse: [debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...']]].
"Tell the broker to send us no more messages"
	queue stopConsuming.
	self setConsumerNotReady.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ debug ifTrue:[GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')]].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue forceDelete.
"Delete the exchange if the producer is done with it"
	exchg forceDelete.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	^results = self messages
%
category: 'Example 06 (Fanout Exchange)'
classmethod: GsAmqpExample
runConsumerExample6UseTls: useTls

"Example of a simple queue consumer using a newly created fanout exchange.
Start the consumer first, then start the producer."

	| conn queue env count exchg exchgName chan results numExpected debug exampleNum|
	exampleNum := 6.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	numExpected := self numberOfMessages .
	results := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	exchgName := self fanoutExchangeName .
"Open a channel"
	conn openChannelWithId: chan.
"Create a new fanout exchange"
	conn deleteExchangeNamed: exchgName  channel: chan forceIfInUse:  true.
	exchg := GsAmqpFanoutExchange declareWithConnection: conn name: exchgName channel: chan durable: false autoDelete: false .

"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: false.
	debug ifTrue:[GsFile gciLogServer: 'Queue name is ' , queue name].
"Bind the queue to our new exchange, Fanout exchanges do not use a routing key."
	queue bindToExchange: exchg.
"Tell broker we want to start consuming this queue"
	queue beginConsumingWithNoLocal: false noAck: true.
	count := 0.
	env := GsAmqpEnvelope new.
	self setConsumerReady: exampleNum.
"Loop until we have received all messages"
	[count == numExpected] whileFalse:
			[(queue consumeMessageInto: env timeoutMs: 3000)
				ifTrue:
					[count := count + 1.
					results add: env messageBody.
					debug ifTrue:[GsFile gciLogServer: 'msg ' , count asString , ': ' , env messageBody]. ]
				ifFalse: [debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...']]].
"Tell the broker to send us no more messages"
	queue stopConsuming.
	self setConsumerNotReady.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ debug ifTrue:[GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')]].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue forceDelete.
"Delete the exchange if the producer is done with it"
	exchg forceDelete.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	^results = self messages
%
category: 'Example 07 (Headers Exchange)'
classmethod: GsAmqpExample
runConsumerExample7UseTls: useTls

"Example of a simple queue consumer using a newly created headers exchange.
Start the consumer first, then start the producer."

	| conn queue env count exchg exchgName chan results numExpected debug matchKeyDict exampleNum|
	exampleNum := 7.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	numExpected := self numberOfMessages .
	results := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	exchgName := self headersExchangeName .
"Open a channel"
	conn openChannelWithId: chan.
"Create a new headers exchange"
	conn deleteExchangeNamed: exchgName  channel: chan forceIfInUse:  true.
	exchg := GsAmqpHeadersExchange declareWithConnection: conn name: exchgName channel: chan durable: false autoDelete: false .

"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: false.
	debug ifTrue:[GsFile gciLogServer: 'Queue name is ' , queue name].
"Create a dictionary of header match keys and values."
	(matchKeyDict := KeyValueDictionary new) at: 'Header1' put: 'foo' ; at: 'Header2' put: 'bar' .
"Bind new queue to new exchange such that the exchange will route messages to the queue if ANY
of the headers match."
	queue bindToHeadersExchange: exchg matchAnyInDictionary: matchKeyDict.
"Tell broker we want to start consuming this queue"
	queue beginConsumingWithNoLocal: false noAck: true.
	count := 0.
	env := GsAmqpEnvelope new.
	self setConsumerReady: exampleNum.
"Loop until we have received all messages"
	[count == numExpected] whileFalse:
			[(queue consumeMessageInto: env timeoutMs: 3000)
				ifTrue:
					[count := count + 1.
					results add: env messageBody.
					debug ifTrue:[GsFile gciLogServer: 'msg ' , count asString , ': ' , env messageBody]. ]
				ifFalse: [debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...']]].
"Tell the broker to send us no more messages"
	queue stopConsuming.
	self setConsumerNotReady.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ debug ifTrue:[GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')]].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue forceDelete.
"Delete the exchange if the producer is done with it"
	exchg forceDelete.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	^results = self messages
%
category: 'Example 08 (Topic Exchange)'
classmethod: GsAmqpExample
runConsumerExample8UseTls: useTls

"Example of a simple queue consumer using a newly created topic exchange.
Start the consumer first, then start the producer."

	| conn queue env count exchg exchgName chan results numExpected debug bindkey exampleNum|
	exampleNum := 8.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	numExpected := self numberOfMessages .
	results := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	exchgName := self topicExchangeName .

"For topic exchanges, in the bind key $* represents exactly 1 word and $# represents 0 or more words.
So for bind key someTopic.*, someTopic.bindkey will match but someTopic.bindkey.bad will not."
	bindkey := 'someTopic.*'.

"Open a channel"
	conn openChannelWithId: chan.
"Create a new topic exchange"
	conn deleteExchangeNamed: exchgName  channel: chan forceIfInUse:  true.
	exchg := GsAmqpTopicExchange declareWithConnection: conn name: exchgName channel: chan durable: false autoDelete: false .

"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: false.
	debug ifTrue:[GsFile gciLogServer: 'Queue name is ' , queue name].
"Bind new queue to new exchange"
	queue bindToExchange: exchg routingKey: bindkey .
"Tell broker we want to start consuming this queue"
	queue beginConsumingWithNoLocal: false noAck: true.
	count := 0.
	env := GsAmqpEnvelope new.
	self setConsumerReady: exampleNum.
"Loop until we have received all messages"
	[count == numExpected] whileFalse:
			[(queue consumeMessageInto: env timeoutMs: 3000)
				ifTrue:
					[count := count + 1.
					results add: env messageBody.
					debug ifTrue:[GsFile gciLogServer: 'msg ' , count asString , ': ' , env messageBody]. ]
				ifFalse: [debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...']]].
"Tell the broker to send us no more messages"
	queue stopConsuming.
	self setConsumerNotReady.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ debug ifTrue:[GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')]].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue forceDelete.
"Delete the exchange if the producer is done with it"
	exchg forceDelete.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	^results = self messages
%
category: 'Example 99 (Perf Test)'
classmethod: GsAmqpExample
runConsumerExample99UseTls: useTls

"Example of a simple queue consumer using the built-in direct exchange.
Start the consumer first, then start the producer."

	| conn routingKey queue env count exchgName chan numExpected sys abortCount startNs endNs exampleNum |
	exampleNum := 99.
	(sys := System)
		_cacheName: 'Consumer';
		sessionCacheStatAt: 0 put: 0 ;
		transactionMode: #manualBegin;
		abortTransaction.
	abortCount := 0.
	conn := self getConnection: useTls.
	numExpected := self numMessagesForPerformanceTest.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchgName := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: true.
	GsFile gciLogServer: 'Queue name is ' , queue name.
"Bind our queue to the built-in exchange"
	conn
		bindQueueWithName: queue name
		toExchangeWithName: exchgName
		channel: chan
		routingKey: routingKey.
"Tell broker we want to start consuming this queue"
	queue beginConsumingWithNoLocal: false noAck: true.
	env := GsAmqpEnvelope new.
	self setConsumerReady: exampleNum.
"Wait here for the producer to start sending messages"
	[queue consumeMessageInto: env timeoutMs: 3000]
		whileFalse:[ GsFile gciLogServer: 'Waiting for a message...'].
	GsFile gciLogServer: 'Started receiving messages.'.
	count := 1.
	sys enableSignaledAbortError .
	startNs := sys timeNs.
"Loop until we have received all messages"
	[ [
			[count == numExpected] whileFalse: [
				(queue consumeMessageInto: env timeoutMs: 3000)
					ifTrue:[count := count + 1.
"Tell RabbitMQ to cleanup memory every 1000 messages"
						count \\ 1000 == 0 ifTrue: [conn maybeReleaseBuffers].
						sys sessionCacheStatAt: 0 put: count]
					ifFalse: [GsFile gciLogServer: 'Waiting for a message...']
			 ]
		] on: TransactionBacklog do:[:ex | abortCount := abortCount + 1.
						sys abortTransaction; enableSignaledAbortError.
						ex resume].
		endNs := sys timeNs.
	] ensure:[sys transactionMode: #autoBegin ; abortTransaction. self setConsumerNotReady ].
	sys sessionCacheStatAt: 0 put: 0.
"Tell the broker to send us no more messages"
	queue stopConsuming.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue deleteIfSafe.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	GsFile
		gciLogServer: 'Received ' , count asString , ' messages in '
				, ((endNs - startNs) // 1000000) asString , ' ms and handled '
				, abortCount asString , ' SigAborts'.
	^true
%
category: 'Example 09 (Acknowlegments 1)'
classmethod: GsAmqpExample
runConsumerExample9UseTls: useTls

"Example of a simple queue consumer using the built-in direct exchange using acknowlegments for each message received.
Start the consumer first, then start the producer."

	| conn routingKey queue env count exchgName chan results numExpected debug exampleNum|
	exampleNum := 9.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	numExpected := self numberOfMessages .
	results := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchgName := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: true.
	debug ifTrue:[GsFile gciLogServer: 'Queue name is ' , queue name].
"Bind our queue to the built-in exchange"
	conn
		bindQueueWithName: queue name
		toExchangeWithName: exchgName
		channel: chan
		routingKey: routingKey.
"Tell broker we want to start consuming this queue and that we will send acknowlegements"
	queue beginConsumingWithNoLocal: false noAck: false.
	count := 0.
	env := GsAmqpEnvelope new.
	self setConsumerReady: exampleNum.
"Loop until we have received all messages"
	[count == numExpected] whileFalse:
			[(queue consumeMessageInto: env timeoutMs: 3000)
				ifTrue:
					[count := count + 1.
					results add: env messageBody.
					queue ackEnvelope: env. "Send acknowlegement to the broker"
					debug ifTrue:[GsFile gciLogServer: 'msg ' , count asString , ': ' , env messageBody]. ]
				ifFalse: [debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...']]].
"Tell the broker to send us no more messages"
	queue stopConsuming.
	self setConsumerNotReady.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ debug ifTrue:[GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')]].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue deleteIfSafe.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	^results = self messages
%
category: 'Examples (Consumer)'
classmethod: GsAmqpExample
runConsumerExampleNumber: num useTls: useTls

| sym |

sym := ('runConsumerExample', num asString, 'UseTls:') asSymbol.
^ self perform: sym with: useTls

%
category: 'Example 10 (Acknowlegements 2)'
classmethod: GsAmqpExample
runProducerExample10UseTls: useTls

^ self runSimpleProducerExample: 10 useTls: useTls
%
category: 'Example 11 (Polling with GsSocket)'
classmethod: GsAmqpExample
runProducerExample11UseTls: useTls

"Example of a simple queue producer using the built-in direct exchange.
Start the consumer first, then start the producer."

^self runSimpleProducerExample: 11 useTls: useTls
%
category: 'Example 12 (Binary Messages)'
classmethod: GsAmqpExample
runProducerExample12UseTls: useTls

"Example of a simple queue producer using the built-in direct exchange to send encrypted strings as binary messages.
Start the consumer first, then start the producer."

	| conn routingKey exchg chan result key salt payload exampleNum|
	exampleNum := 12.
	conn := self getConnection: useTls.
	result := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchg := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Get enryption key and salt byte arrays"
	key := self encryptionKey.
	salt := self encryptionSalt.
	payload := ByteArray new.
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish all messages"
	self messages do:[:msg|
"Encrypt"
			msg aesEncryptWith256BitKey: key salt: salt into: payload.
"Publish the message to the exchange"
			conn
				publishMessage: payload
				channel: chan
				exchange: exchg
				routingKey: routingKey
				mandatory: false
				properties: nil].
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
	^ true
%
category: 'Example 01 (Simple producer/consumer)'
classmethod: GsAmqpExample
runProducerExample1UseTls: useTls

"Example of a simple queue producer using the built-in direct exchange.
Start the consumer first, then start the producer."

	| conn routingKey exchg chan result exampleNum |
	exampleNum := 1.
	conn := self getConnection: useTls.
	result := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchg := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish all messages"
	self messages do:[:msg|
"Publish the message to the exchange"
			conn
				publishMessage: msg
				channel: chan
				exchange: exchg
				routingKey: routingKey
				mandatory: false
				properties: nil].
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
	^ true
%
category: 'Example 02 (Publisher Confirms 1)'
classmethod: GsAmqpExample
runProducerExample2UseTls: useTls

"Example of a producer use publisher confirms to confirm every message before the next message is sent."

	| routingKey conn exchgName publisher  debug count exampleNum|
	exampleNum := 2.
	debug := self debugEnabled .
	conn := self getConnection: useTls.
	routingKey := self routingKey.
	exchgName :=  GsAmqpDirectExchange defaultName. "Name of a built-in exchange"

"opens a new dedicated channel and enables publisher confirms"
	publisher := GsAmqpConfirmedMessagePublisher
				newForConnection: conn
				exchange: exchgName
				routingKey: routingKey
				mandatory: false.
	count := 0.
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish all messages"
	self messages
		do:
			[:msg |
			| confirmed msgObj |
			count := count + 1.
"Publish the message to the exchange"
			msgObj := publisher publishMessageString: msg.
			debug ifTrue:[GsFile gciLogServer: 'Sent message ' , count asString , ' waiting for ACK'].
"Poll for confirmation"
			[(confirmed := publisher pollForConfirmsWithTimeoutMs: 1000) size == 0]
				whileTrue: [debug ifTrue:[GsFile gciLogServer: ('Still waiting for confirmation of message ', count asString)]].
			debug ifTrue:[confirmed do:[:e |
					GsFile gciLogServer: 'Got confirmation for msg ' , e id asString , ': '
								, e state asString]]].
"Close socket connection"
	conn closeConnection.
	^true
%
category: 'Example 03 (Publisher Confirms 2)'
classmethod: GsAmqpExample
runProducerExample3UseTls: useTls
	"Example of a simple queue producer using the built-in direct exchange.
	All messages are sent before looking for any publisher confirms. This allows for fewer round trips to the
	broker because the broker may confirm multiple messages with a single response.
	Start the consumer first, then start the producer."

	| bindkey debug count conn exchg publisher undeliverable ok exampleNum |
	exampleNum := 3.
	debug := self debugEnabled.
	bindkey := self routingKey.
	exchg := GsAmqpDirectExchange defaultName.	"Name of a built-in exchange"
	conn := self getConnection: useTls.
"Open a new channel and enable publisher confirms"
	publisher := GsAmqpConfirmedMessagePublisher
				newForConnection: conn
				exchange: exchg
				routingKey: bindkey
				mandatory: true.
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish messages all at once"
	count := 0.
	self messages do:
			[:msg |
			| msgObj |
			count := count + 1.
			"Publish the message to the exchange"
			msgObj := publisher publishMessageString: msg.
			debug ifTrue: [GsFile gciLogServer: ('Sent message ' , count asString)]].

"Poll for confirmations until all confirms are received."
	[publisher publishedMessages size > 0] whileTrue:
			[| results |
			debug
				ifTrue:
					[GsFile
						gciLogServer: ('Waiting on ' , publisher publishedMessages size asString
								, ' outstanding acks')].
			results := publisher pollForConfirmsWithTimeoutMs: 100.
			debug
				ifTrue:
					[results size == 0
						ifTrue: [GsFile gciLogServer: ('Got nothing after waiting 100 ms')]
						ifFalse:
							[results do:
									[:msg |
									GsFile gciLogServer: ('Got result for msg ' , msg id asString , ': '
												, msg state asString)]]]].
	undeliverable := publisher undeliverableMessageCount.
	ok := undeliverable size == 0.
	(ok not and:[debug]) ifTrue:[
			GsFile gciLogServer: (undeliverable asString, ' messages were not delivered by the broker ('
								, publisher returnedMessageCount asString , ' returned, '
								, publisher rejectedMessageCount asString , ' rejected)')
	].

"Close broker connection"
	conn closeConnection.
	^ok
%
category: 'Example 04 (Transactions)'
classmethod: GsAmqpExample
runProducerExample4UseTls: useTls

"Example of a simple queue producer using the built-in direct exchange and RabbitMQ transactions.
Start the consumer first, then start the producer."

	| bindkey conn exchg chan exampleNum|
	exampleNum := 4.
	chan := 1. "Channel we will use (SmallInteger)"
	bindkey := self routingKey.
	exchg := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Connect to remote host"
	conn := self getConnection: useTls.
"Open a channel"
	conn openChannelWithId: chan.
"Put channel in transaction mode"
	conn makeChannelTransactional: chan.
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish bad messages"
	self badMessages do:[:badMsg|
			conn
				publishMessage: badMsg
				channel: chan
				exchange: exchg
				routingKey: bindkey
				mandatory: false
				properties: nil.
			].
"Rollback the transaction. Consumer should not see any of these messages."
	conn rollbackTransactionOnChannel: chan.
"Now publish good messages"
	self messages do:[:msg|
"Publish the message to the exchange"
			conn
				publishMessage: msg
				channel: chan
				exchange: exchg
				routingKey: bindkey
				mandatory: false
				properties: nil.
			].
"Commit. Consumer should now receive all messages."
	conn commitTransactionOnChannel: chan.
"Close socket connection"
	conn closeConnection.
	^true
%
category: 'Example 05 (Direct Exchange)'
classmethod: GsAmqpExample
runProducerExample5UseTls: useTls

"Example of a simple queue consumer using a newly created direct exchange.
Start the consumer first, then start the producer."

	| conn routingKey exchg exchgName chan  debug exampleNum|
	exampleNum := 5.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
"Open a channel"
	conn openChannelWithId: chan.
"declare the exchange. Consumer already created it"
	exchgName := self directExchangeName .
	exchg := GsAmqpDirectExchange declareWithConnection: conn name: exchgName channel: chan durable: false autoDelete: false .
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish all messages"
	self messages do:[:msg|
"Publish the message to the exchange"
			exchg
				publishMessage: msg
				routingKey: routingKey
				mandatory: false
				properties: nil].
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
	^true
%
category: 'Example 06 (Fanout Exchange)'
classmethod: GsAmqpExample
runProducerExample6UseTls: useTls

"Example of a simple queue consumer using a newly created fanout exchange.
Start the consumer first, then start the producer."

	| conn exchg exchgName chan  debug exampleNum |
	exampleNum := 6.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	chan := 1. "Channel we will use (SmallInteger)"
"Open a channel"
	conn openChannelWithId: chan.
"declare the exchange. Consumer already created it"
	exchgName := self fanoutExchangeName .
	exchg := GsAmqpFanoutExchange declareWithConnection: conn name: exchgName channel: chan durable: false autoDelete: false .
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish all messages"
	self messages do:[:msg|
"Publish the message to the exchange"
			exchg
				publishMessage: msg
				mandatory: false
				properties: nil].
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
	^true
%
category: 'Example 07 (Headers Exchange)'
classmethod: GsAmqpExample
runProducerExample7UseTls: useTls

"Example of a simple queue consumer using a newly created headers exchange.
Start the consumer first, then start the producer."

	| conn exchg exchgName chan  debug keys badValues goodValues badProps goodProps exampleNum |
	exampleNum := 7 .
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	chan := 1. "Channel we will use (SmallInteger)"
"Open a channel"
	conn openChannelWithId: chan.
"declare the exchange. Consumer already created it"
	exchgName := self headersExchangeName .
	exchg := GsAmqpHeadersExchange declareWithConnection: conn name: exchgName channel: chan durable: false autoDelete: false .
	keys := Array with: 'Header1' with: 'Header2'.
	badValues := Array with: 'NoMatchHere' with: 'NoMatchThere' .
	goodValues := Array with: 'foo' with: 'bar' .
	badProps := GsAmqpHeadersExchange generateMessagePropertiesFromHeadersKeys: keys values: badValues  .
	goodProps := GsAmqpHeadersExchange generateMessagePropertiesFromHeadersKeys: keys values: goodValues.
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish bad messages using badProps to the exchange. Consumer should not see these."
	self badMessages do:[:msg|
			exchg publishMessage: msg routingKey: nil mandatory: false properties: badProps ].

"Publish good messages using goodProps to the exchange. Consumer should see all these."
	self messages do:[:msg|
			exchg publishMessage: msg routingKey: nil mandatory: false properties: goodProps ].

"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
	^true
%
category: 'Example 08 (Topic Exchange)'
classmethod: GsAmqpExample
runProducerExample8UseTls: useTls

"Example of a simple queue consumer using a newly created topic exchange.
Start the consumer first, then start the producer."

	| conn exchg exchgName chan  debug goodBindKey badBindKey exampleNum |
	exampleNum := 8.
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	chan := 1. "Channel we will use (SmallInteger)"
"Open a channel"
	conn openChannelWithId: chan.
"declare the exchange. Consumer already created it"
	exchgName := self topicExchangeName .
	exchg := GsAmqpTopicExchange declareWithConnection: conn name: exchgName channel: chan durable: false autoDelete: false .
	goodBindKey := 'someTopic.bindkey'.
	badBindKey := 'someTopic.bindkey.bad'.
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish bad messages using badBindKey to the exchange. Consumer should not see these."
	self badMessages do:[:msg|
			exchg publishMessage: msg routingKey: badBindKey mandatory: false properties: nil ].

"Publish good messages using goodBindKey to the exchange. Consumer should see all these."
	self messages do:[:msg|
			exchg publishMessage: msg routingKey: goodBindKey mandatory: false properties: nil ].

"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
	^true
%
category: 'Example 99 (Perf Test)'
classmethod: GsAmqpExample
runProducerExample99UseTls: useTls

"Example of a simple queue producer using the built-in direct exchange to send 1M messages while handling SigAborts outside of transaction.
Starts an external session to generate commit records.
Start the consumer first, then start the producer."

	| conn routingKey exchg chan sys numSent numToSend idx max messages abortCount startNs endNs sess exampleNum|
	exampleNum := 99 .
	conn := self getConnection: useTls.
	abortCount := 0.
	sys := System.
	sys _cacheName: 'Producer' ;
		sessionCacheStatAt: 0 put: 0 ;
		transactionMode: #manualBegin;
		abortTransaction.

	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchg := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Publish all messages"
	messages := self messages.
	numToSend := self numMessagesForPerformanceTest.
	numSent := 0.
	max := messages size.
	idx := 1.
	abortCount := 0.
"Start external session"
	sess := (GsTsExternalSession newDefault) login ; yourself .
	self setRunCommitter: true.
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"tell external session to create 4 commit records per second"
	sess nbExecute: 'GsAmqpExample makeCommitRecords' .
	startNs := sys timeNs.
	[ [
			[numSent == numToSend] whileFalse:[
				conn
					publishMessage: (messages at: idx)
					channel: chan
					exchange: exchg
					routingKey: routingKey
					mandatory: false
					properties: nil.
			numSent := numSent + 1.
			idx := idx + 1.
			idx > max ifTrue:[ idx := 1 ].
"Tell RabbitMQ to cleanup memory every 1000 messages"
			numSent \\ 1000 == 0 ifTrue: [conn maybeReleaseBuffers].
			sys sessionCacheStatAt: 0 put: numSent.
			].
		] on: TransactionBacklog do:[:ex | abortCount := abortCount + 1.
						sys abortTransaction; enableSignaledAbortError.
						ex resume].
		endNs := System timeNs.
	] ensure:[ sess logout. sys transactionMode: #autoBegin ; abortTransaction. self setRunCommitter: false ].
	sys sessionCacheStatAt: 0 put: 0.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
	GsFile gciLogServer: ('Sent unexpected token->', numSent asString, ' messages in ',
		 ((endNs - startNs) // 1000000) asString,
		' ms and handled ', abortCount asString, ' SigAborts').
	^ true
%
category: 'Example 09 (Acknowlegments 1)'
classmethod: GsAmqpExample
runProducerExample9UseTls: useTls

^ self runSimpleProducerExample: 9 useTls: useTls
%
category: 'Examples (Producer)'
classmethod: GsAmqpExample
runProducerExampleNumber: num useTls: useTls

| sym |

sym := ('runProducerExample', num asString, 'UseTls:') asSymbol.
^ self perform: sym with: useTls

%
category: 'Examples (Consumer)'
classmethod: GsAmqpExample
runSimpleConsumerExample: exampleNum useTls: useTls

"Example of a simple queue consumer using the built-in direct exchange.
Start the consumer first, then start the producer."

	| conn routingKey queue env count exchgName chan results numExpected debug |
	debug := self debugEnabled.
	conn := self getConnection: useTls.
	numExpected := self numberOfMessages .
	results := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchgName := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Declare the queue we will use. Let the broker choose the queue name"
	queue := GsAmqpQueue
				declareWithConnection: conn
				durable: false
				exclusive: false
				autoDelete: true.
	debug ifTrue:[GsFile gciLogServer: 'Queue name is ' , queue name].
"Bind our queue to the built-in exchange"
	conn
		bindQueueWithName: queue name
		toExchangeWithName: exchgName
		channel: chan
		routingKey: routingKey.
"Tell broker we want to start consuming this queue"
	queue beginConsumingWithNoLocal: false noAck: true.
	count := 0.
	env := GsAmqpEnvelope new.
	self setConsumerReady: exampleNum .
"Loop until we have received all messages"
	[count == numExpected] whileFalse:
			[(queue consumeMessageInto: env timeoutMs: 3000)
				ifTrue:
					[count := count + 1.
					results add: env messageBody.
					debug ifTrue:[GsFile gciLogServer: 'msg ' , count asString , ': ' , env messageBody]. ]
				ifFalse: [debug ifTrue:[GsFile gciLogServer: 'Waiting for a message...']]].
"Tell the broker to send us no more messages"
	queue stopConsuming.
	self setConsumerNotReady.
"Check if there are any more messages for us but do not block. The broker could have sent a message before it received the stop message."
	[queue consumeMessageInto: env timeoutMs: 0] whileTrue:[ count := count + 1 ].
	count > numExpected ifTrue:[ debug ifTrue:[GsFile gciLogServer: ((count - numExpected) asString, ' messages were discarded.')]].
"Unbind the queue from the exchange"
	queue unbind.
"Delete the queue"
	queue deleteIfSafe.
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
"Answer if strings from sender match what we expect"
	^results = self messages
%
category: 'Examples (Producer)'
classmethod: GsAmqpExample
runSimpleProducerExample: exampleNum useTls: useTls

"Example of a simple queue producer using the built-in direct exchange.
Start the consumer first, then start the producer."

	| conn routingKey exchg chan result |
	conn := self getConnection: useTls.
	result := Array new.
	chan := 1. "Channel we will use (SmallInteger)"
	routingKey := self routingKey. "Routing key"
	exchg := GsAmqpDirectExchange defaultName. "Name of a built-in exchange"
"Open a channel"
	conn openChannelWithId: chan.
"Wait for consumer to be ready"
	self waitForConsumerReady: exampleNum upTo: self waitForConsumerTimeMs.
"Publish all messages"
	self messages do:[:msg|
"Publish the message to the exchange"
			conn
				publishMessage: msg
				channel: chan
				exchange: exchg
				routingKey: routingKey
				mandatory: false
				properties: nil].
"Close channel"
	conn closeChannelWithId: chan.
"Close socket connection"
	conn closeConnection.
	^ true
%
category: 'Producer - Consumer Coordination'
classmethod: GsAmqpExample
setConsumerNotReady

^ self setConsumerReady: 0
%
category: 'Producer - Consumer Coordination'
classmethod: GsAmqpExample
setConsumerReady: exampleNum

System sharedCounter: self sharedCounterId setValue: exampleNum
%
category: 'Example 99 (Perf Test)'
classmethod: GsAmqpExample
setRunCommitter: bool

System sharedCounter: (self committerSharedCounterId) setValue: bool asBit
%
category: 'Producer - Consumer Coordination'
classmethod: GsAmqpExample
sharedCounterId

"Shared counter use to coordinate producers and consumers"

^ 0
%
category: 'Accessing'
classmethod: GsAmqpExample
tlsPort

^ tlsPort ifNil:[ self defaultTlsPort ] ifNotNil:[ tlsPort ]
%
category: 'Updating'
classmethod: GsAmqpExample
tlsPort: newValue

tlsPort := newValue
%
category: 'Accessing'
classmethod: GsAmqpExample
topicExchangeName

^ self exchangeNameForKind: 'topic'
%
category: 'Producer - Consumer Coordination'
classmethod: GsAmqpExample
waitForConsumerReady: exampleNum upTo: ms

	^(self waitForConsumerReadyNoError: exampleNum upTo: ms)
		ifTrue: [true]
		ifFalse:
			[self error: ('timeout waiting for consumer for example ', exampleNum asString, 'to start after ' , ms asString
						, ' milliseconds')]
%
category: 'Producer - Consumer Coordination'
classmethod: GsAmqpExample
waitForConsumerReadyNoError: exampleNum upTo: ms

	| endNs sys |
	sys := System.
	endNs := sys timeNs + (ms * 1000000).
	[sys timeNs < endNs] whileTrue: [(
		self consumerIsReady: exampleNum) ifTrue: [^true].
		sys _sleepMs: 100.
	].
	^false "timed out"
%
category: 'Producer - Consumer Coordination'
classmethod: GsAmqpExample
waitForConsumerTimeMs

"Time in milliseconds for the consumer to be ready."

^ 60000
%
! ------------------- Instance methods for GsAmqpExample
! ------------------- Remove existing behavior from GsAmqpTlsConnection
removeAllMethods GsAmqpTlsConnection
removeAllClassMethods GsAmqpTlsConnection
! ------------------- Class methods for GsAmqpTlsConnection
category: 'Constants'
classmethod: GsAmqpTlsConnection
defaultPort

^ 5671
%
category: 'Instance Creation'
classmethod: GsAmqpTlsConnection
newOnHost: hostOrIp port: aPort caCertPath: caCertPath certPath: certPath keyObj: aGsTlsPrivateKey


	| result |
	aGsTlsPrivateKey _validateClass: GsTlsPrivateKey .
	result := self newOnHost: hostOrIp port: aPort.
	^result
		caCertPath: caCertPath;
		certPath: certPath;
		privateKey: aGsTlsPrivateKey;
		yourself
%
category: 'Instance Creation'
classmethod: GsAmqpTlsConnection
newOnHost: hostOrIp port: aPort caCertPath: caCertPath certPath: certPath keyPath: keyPath

"Use this method only if the private key file referenced by keyPath does not have a passphrase."

	| result |
	result := self newOnHost: hostOrIp port: aPort.
	^result
		caCertPath: caCertPath;
		certPath: certPath;
		privateKey: keyPath;
		yourself
%
category: 'Instance Creation'
classmethod: GsAmqpTlsConnection
newOnHost: hostOrIp port: aPort caCertPath: caCertPath certPath: certPath keyPath: keyPath keyPassphrase: passPhrase

"Use this method if the private key file requires a passphrase."

	"Note: amqp_ssl_socket_set_key_passwd() does not appear to work.
As a workaround, we decrypt and load the private key using GsTlsPrivateKey, then pass the PEM string to RabbitMQ."

	| aGsTlsPrivateKey |
	aGsTlsPrivateKey := GsTlsPrivateKey newFromPemFile: keyPath
				withPassphrase: passPhrase.
	^self
		newOnHost: hostOrIp
		port: aPort
		caCertPath: caCertPath
		certPath: certPath
		keyObj: aGsTlsPrivateKey
%
category: 'Instance Creation'
classmethod: GsAmqpTlsConnection
newOnHost: hostOrIp port: aPort caCertPath: caCertPath certPath: certPath keyString: keyString keyPassphrase: passPhrase

"Use this method when you have a private key in the form of a PEM string. pass phrase must be the pass phrase for the private key or nil
if the key requires no pass phrase."

"Note: amqp_ssl_socket_set_key_passwd() does not appear to work.
As a workaround, we decrypt and load the private key using GsTlsPrivateKey, then pass the PEM string to RabbitMQ."

	|  aGsTlsPrivateKey |
	aGsTlsPrivateKey := GsTlsPrivateKey newFromPemString: keyString withPassphrase: passPhrase .
	^ self newOnHost: hostOrIp port: aPort caCertPath: caCertPath certPath: certPath keyObj: aGsTlsPrivateKey
%
! ------------------- Instance methods for GsAmqpTlsConnection
category: 'Accessing'
method: GsAmqpTlsConnection
caCertPath
	^caCertPath
%
category: 'Updating'
method: GsAmqpTlsConnection
caCertPath: newValue
	caCertPath := newValue
%
category: 'Accessing'
method: GsAmqpTlsConnection
certPath
	^certPath
%
category: 'Updating'
method: GsAmqpTlsConnection
certPath: newValue
	certPath := newValue
%
category: 'Initialization'
method: GsAmqpTlsConnection
initialize

	super initialize.
	^self
		verifyPeer: false;
		verifyHostname: false;
		yourself
%
category: 'Initialization'
method: GsAmqpTlsConnection
newSocket

self validateConnection.
^ self library amqp_ssl_socket_new_:  self connection
%
category: 'Accessing'
method: GsAmqpTlsConnection
privateKey
	^privateKey
%
category: 'Updating'
method: GsAmqpTlsConnection
privateKey: newValue
	privateKey := newValue
%
category: 'Private'
method: GsAmqpTlsConnection
setCaCert

| rc |
self validateCaCertPath; validateSocket .
rc := self library amqp_ssl_socket_set_cacert_: self socket _: self caCertPath.
^ rc == 0
	ifTrue:[ self ]
	ifFalse:[ GsRabbitMqError signalWithErrorCode: rc library: self library ]
%
category: 'Private'
method: GsAmqpTlsConnection
setCertAndKey

	| rc |
	self validateCertPath ; validatePrivateKey .
	(self privateKey isKindOf: GsTlsPrivateKey)
		ifTrue: [^self setCertAndKeyFromPemString].
	self validateSocket .
	rc := self library
		amqp_ssl_socket_set_key_: self socket
		_: self certPath
		_: self privateKey.
	^rc == 0
		ifTrue: [self]
		ifFalse: [GsRabbitMqError signalWithErrorCode: rc library: self library]
%
category: 'Private'
method: GsAmqpTlsConnection
setCertAndKeyFromPemString
"privateKey is a GsTlsPrivateKey"
	| rc pem cba key |
	self validateSocket ; validatePrivateKey ; validateCertPath .
	(key := self privateKey) _validateClass: GsTlsPrivateKey .
	pem := key asPemString.
	cba := CByteArray withAll: pem.
	rc := self library
				amqp_ssl_socket_set_key_buffer_: self socket
				_: self certPath
				_: cba
				_: pem size.
"Workaround for Issue 723: amqp_ssl_socket_set_key_buffer returns 1 on success instead of AMQP_STATUS_OK (0)
accept rc ==1 as Success.  See: https://github.com/alanxz/rabbitmq-c/issues/723"
	^(rc == 1 or:[ rc == 0])
		ifTrue: [self]
		ifFalse: [GsRabbitMqError signalWithErrorCode: rc library: self library]
%
category: 'Private'
method: GsAmqpTlsConnection
setSocketOptions


^ self setCaCert ;
	setCertAndKey ;
	setVerifyPeer ;
	setVerifyHostname ;
	yourself
%
category: 'Private'
method: GsAmqpTlsConnection
setVerifyHostname

| val |
self validateSocket .
(val := self verifyHostname) _validateClass: Boolean .
self library amqp_ssl_socket_set_verify_hostname_: self socket _: val asBit .
^ self
%
category: 'Private'
method: GsAmqpTlsConnection
setVerifyPeer

| val |
self validateSocket .
(val := self verifyPeer) _validateClass: Boolean .
self library amqp_ssl_socket_set_verify_peer_: self socket _: val asBit.
^ self
%
category: 'Validation'
method: GsAmqpTlsConnection
validateCaCertPath

	| obj |
	(obj := self caCertPath)
		ifNil: [self error: 'path to CA cert has not been set']
		ifNotNil: [obj _validateClass: String].
	^self
%
category: 'Validation'
method: GsAmqpTlsConnection
validateCertPath

	| obj |
	(obj := self certPath)
		ifNil: [self error: 'path to cert has not been set']
		ifNotNil: [obj _validateClass: String].
	^self
%
category: 'Validation'
method: GsAmqpTlsConnection
validatePrivateKey

	| obj |
	(obj := self privateKey)
		ifNil: [self error: 'private key has not been set']
		ifNotNil: [obj _validateClasses: { String . GsTlsPrivateKey } ].
	^self
%
category: 'Accessing'
method: GsAmqpTlsConnection
verifyHostname
	^verifyHostname
%
category: 'Updating'
method: GsAmqpTlsConnection
verifyHostname: newValue
	verifyHostname := newValue
%
category: 'Accessing'
method: GsAmqpTlsConnection
verifyPeer
	^verifyPeer
%
category: 'Updating'
method: GsAmqpTlsConnection
verifyPeer: newValue
	verifyPeer := newValue
%
! ------------------- Remove existing behavior from GsAmqpRpcReply
removeAllMethods GsAmqpRpcReply
removeAllClassMethods GsAmqpRpcReply
! ------------------- Class methods for GsAmqpRpcReply
category: 'Constants'
classmethod: GsAmqpRpcReply
AMQP_RESPONSE_LIBRARY_EXCEPTION

"library error, an error occurred in the library, examine the library_error"
^ 2
%
category: 'Constants'
classmethod: GsAmqpRpcReply
AMQP_RESPONSE_NONE

"the library got an EOF from the socket"

^ 0
%
category: 'Constants'
classmethod: GsAmqpRpcReply
AMQP_RESPONSE_NORMAL

"response normal, the RPC completed successfully"
^ 1
%
category: 'Constants'
classmethod: GsAmqpRpcReply
AMQP_RESPONSE_SERVER_EXCEPTION
"server exception, the broker returned an error, check replay"

^ 3
%
category: 'Constants'
classmethod: GsAmqpRpcReply
AMQP_STATUS_SOCKET_CLOSED

^ -16r11
%
category: 'Constants'
classmethod: GsAmqpRpcReply
AMQP_STATUS_TIMEOUT

^ -16rD
%
category: 'Instance Creation'
classmethod: GsAmqpRpcReply
new

^ self shouldNotImplement: #new
%
category: 'Instance Creation'
classmethod: GsAmqpRpcReply
new: aSize

^ self shouldNotImplement: #new:
%
category: 'Instance Creation'
classmethod: GsAmqpRpcReply
newWithConnection: conn

	^(self gcMalloc: self sizeInC)
		connection:  conn;
		yourself
%
category: 'Constants'
classmethod: GsAmqpRpcReply
sizeInC

^ 32
%
category: 'Constants'
classmethod: GsAmqpRpcReply
unknownLibraryErrorCode

"AMQP does not have this code but needs it"

^ - 65535
%
! ------------------- Instance methods for GsAmqpRpcReply
category: 'Reusing'
method: GsAmqpRpcReply
clearForReuse

"Clear the object so it can be reused for a new C call. Do not clear the library inst var"

	^ self
		memset: 0 from: 0 to: -1; "Clear C memory"
		replyType: 0 ;
		methodNumber: 0 ;
		libraryError: 0 ;
		method:  nil ;
		yourself
%
category: 'Accessing'
method: GsAmqpRpcReply
connection
	^connection
%
category: 'Updating'
method: GsAmqpRpcReply
connection: newValue
	connection := newValue
%
category: 'Initialization'
method: GsAmqpRpcReply
initializeFromC

"Initialize the inst vars from the C memory. Only to be called after C memory has been initialized"

replyType := self int32At: 0.
methodNumber := self int32At: 8.
libraryError := self int32At: 24.
self isServerException
  ifTrue:[ self method: (GsAmqpMethod fromRpcReply: self)  ].
^ self
%
category: 'Testing'
method: GsAmqpRpcReply
isFailure

^ self isSuccess not
%
category: 'Testing'
method: GsAmqpRpcReply
isLibraryException

^self replyType == self class AMQP_RESPONSE_LIBRARY_EXCEPTION
%
category: 'Testing'
method: GsAmqpRpcReply
isServerException

^self replyType == self class AMQP_RESPONSE_SERVER_EXCEPTION
%
category: 'Testing'
method: GsAmqpRpcReply
isSocketEof

^self replyType == self class AMQP_RESPONSE_NONE
%
category: 'Testing'
method: GsAmqpRpcReply
isSuccess

^self replyType == self class AMQP_RESPONSE_NORMAL
%
category: 'Testing'
method: GsAmqpRpcReply
isTimeout

^ self isLibraryException and:[ self libraryError == self class AMQP_STATUS_TIMEOUT ]
%
category: 'Error Handling'
method: GsAmqpRpcReply
lastErrorString

"Answer a String describing the last library error code or nil if no library error has occurred.
Note: The library returns the string '(unknown error)' in the event that the error code is unknown."

	^self libraryError == 0
		ifTrue: [nil]
		ifFalse: [self connection library amqp_error_string2_:  self libraryError]
%
category: 'Accessing'
method: GsAmqpRpcReply
libraryError
	^libraryError
%
category: 'Updating'
method: GsAmqpRpcReply
libraryError: newValue
	libraryError := newValue
%
category: 'Accessing'
method: GsAmqpRpcReply
libraryErrorNotNoError
	^libraryError == 0 ifTrue:[ self class unknownLibraryErrorCode ] ifFalse:[ libraryError ]
%
category: 'Accessing'
method: GsAmqpRpcReply
method
	^method
%
category: 'Updating'
method: GsAmqpRpcReply
method: newValue
	method := newValue
%
category: 'Accessing'
method: GsAmqpRpcReply
methodNumber
	^methodNumber
%
category: 'Updating'
method: GsAmqpRpcReply
methodNumber: newValue
	methodNumber := newValue
%
category: 'Error Handling'
method: GsAmqpRpcReply
raiseExceptionForOperation: aString
	^ (GsRabbitMqError newFromRpcReply: self forOperation: aString) signal
%
category: 'Accessing'
method: GsAmqpRpcReply
replyType
	^replyType
%
category: 'Updating'
method: GsAmqpRpcReply
replyType: newValue
	replyType := newValue
%
! ------------------- Remove existing behavior from GsAmqpExchange
removeAllMethods GsAmqpExchange
removeAllClassMethods GsAmqpExchange
! ------------------- Class methods for GsAmqpExchange
category: 'Instance Creation'
classmethod: GsAmqpExchange
declareWithConnection: conn name: exchgName type: type channel: channelIdArg durable: durable autoDelete: autoDelete

	|  result channelId |
	channelId := channelIdArg
				ifNil: [conn openNextChannel]
				ifNotNil: [channelIdArg].
	conn
				declareExchangeNamed: exchgName
				channel: channelId
				type: type
				durable: durable
				autoDelete: autoDelete .

	result := self new.
	^result
		connection: conn;
		type: type;
		channel: channelId;
		name: exchgName;
		durable: durable;
		autoDelete: autoDelete;
		 yourself
%
! ------------------- Instance methods for GsAmqpExchange
category: 'Deleting'
method: GsAmqpExchange
deleteForceIfInUse: forceIfInUse

"Deletes the receiver from the broker. If forceIfInUse is true, the exchange is deleted even if queues are still bound to it.
If forceIfInUse is false, the exchange is only deleted if there are no queues bound, otherwise an exception is raised."

	^self connection
		deleteExchangeNamed: self name
		channel: self channel
		forceIfInUse:  forceIfInUse
%
category: 'Deleting'
method: GsAmqpExchange
deleteIfUnused


^ self deleteForceIfInUse: false
%
category: 'Subclass Methods'
method: GsAmqpExchange
exchangKind

^self subclassResponsibility: #exchangKind
%
category: 'Deleting'
method: GsAmqpExchange
forceDelete

^ self deleteForceIfInUse: true
%
category: 'Publishing'
method: GsAmqpExchange
publishMessage: msg routingKey: routingKey mandatory: mandatory properties: props

	self connection
		publishMessage: msg
		channel: self channel
		exchange: self name
		routingKey: routingKey
		mandatory: mandatory
		properties: props .
	^ self
%
category: 'Accessing'
method: GsAmqpExchange
type
	^type
%
category: 'Updating'
method: GsAmqpExchange
type: newValue
	type := newValue
%
! ------------------- Remove existing behavior from GsAmqpTable
removeAllMethods GsAmqpTable
removeAllClassMethods GsAmqpTable
! ------------------- Class methods for GsAmqpTable
category: 'Instance Creation'
classmethod: GsAmqpTable
emptyTable

^ self new
%
category: 'Instance Creation'
classmethod: GsAmqpTable
newFromArrayOfPairs: array

^(self new) initialize ; buildFromArrayOfPairs: array ; yourself
%
category: 'Instance Creation'
classmethod: GsAmqpTable
newFromDictionary: aDictionary

^(self new) initialize ; buildFromDictionary: aDictionary ; yourself
%
category: 'Instance Creation'
classmethod: GsAmqpTable
newFromKeys: keyArray values: valueArray

	^(self new)
		initialize;
		buildFromKeys: keyArray values: valueArray;
		yourself
%
category: 'Constants'
classmethod: GsAmqpTable
sizeInC

^ 16
%
! ------------------- Instance methods for GsAmqpTable
category: 'Building'
method: GsAmqpTable
buildFromArrayOfPairs: array

	^self
		setEntries: (GsAmqpTableEntryArray newFromArrayOfPairs: array);
		yourself
%
category: 'Building'
method: GsAmqpTable
buildFromDictionary: dict

	^self
		setEntries: (GsAmqpTableEntryArray newFromDictionary: dict);
		yourself
%
category: 'Building'
method: GsAmqpTable
buildFromKeys: keyArray values: valueArray

	^self
		setEntries: (GsAmqpTableEntryArray newFromKeys: keyArray values: valueArray);
		yourself
%
category: 'Accessing'
method: GsAmqpTable
entries
	^entries
%
category: 'Private'
method: GsAmqpTable
entries: newValue
	entries := newValue
%
category: 'Accessing'
method: GsAmqpTable
entriesAddress

^ self uint64At: 8
%
category: 'Initialization'
method: GsAmqpTable
initializeFromC



	^ self numEntries: (self int32At: 0) ;
		entries: (GsAmqpTableEntryArray fromMemoryReferenceIn: self atOffset: 8 elements: self numEntries) ;
		yourself
%
category: 'Accessing'
method: GsAmqpTable
numEntries
	^numEntries
%
category: 'Private'
method: GsAmqpTable
numEntries: newValue
	numEntries := newValue
%
category: 'Updating'
method: GsAmqpTable
setEntries: aGsAmqpTableEntryArrayOrNil

	aGsAmqpTableEntryArrayOrNil
		ifNil:
			[self entries: nil ;
				numEntries: 0 ;
				 zeroMemory]
		ifNotNil:
			[ | numElements |
			aGsAmqpTableEntryArrayOrNil _validateClass: GsAmqpTableEntryArray.
			numElements := aGsAmqpTableEntryArrayOrNil numElements.
			self entries: aGsAmqpTableEntryArrayOrNil;
				numEntries: numElements ;
				uint32At: 0 put: numElements ;
				uint64At: 8 put: aGsAmqpTableEntryArrayOrNil memoryAddress].
	^self
%
! ------------------- Remove existing behavior from GsAmqpBasicProperties
removeAllMethods GsAmqpBasicProperties
removeAllClassMethods GsAmqpBasicProperties
! ------------------- Class methods for GsAmqpBasicProperties
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_APP_ID_FLAG

	^8
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_CLUSTER_ID_FLAG

	^4
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_CONTENT_ENCODING_FLAG

	^16384
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_CONTENT_TYPE_FLAG

	^32768
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_CORRELATION_ID_FLAG

	^1024
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_DELIVERY_MODE_FLAG

	^4096
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_EXPIRATION_FLAG

	^256
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_HEADERS_FLAG

	^8192
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_MESSAGE_ID_FLAG

	^128
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_PRIORITY_FLAG

	^2048
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_REPLY_TO_FLAG

	^512
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_TIMESTAMP_FLAG

	^64
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_TYPE_FLAG

	^32
%
category: 'Constants - Bit Flags'
classmethod: GsAmqpBasicProperties
AMQP_BASIC_USER_ID_FLAG

	^16
%
category: 'Constants'
classmethod: GsAmqpBasicProperties
AMQP_DELIVERY_NONPERSISTENT

^ 1
%
category: 'Constants'
classmethod: GsAmqpBasicProperties
AMQP_DELIVERY_PERSISTENT

^ 2
%
category: 'Constants'
classmethod: GsAmqpBasicProperties
sizeInC

^ 200
%
! ------------------- Instance methods for GsAmqpBasicProperties
category: 'Accessing'
method: GsAmqpBasicProperties
amqpUserId

^ amqpUserId
%
category: 'Updating'
method: GsAmqpBasicProperties
amqpUserId: newValue
	amqpUserId := GsAmqpBytes fromStringOrNil: newValue.
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_USER_ID_FLAG
		newValue: self amqpUserId
		offset: 152
%
category: 'Accessing'
method: GsAmqpBasicProperties
appId
	^appId
%
category: 'Updating'
method: GsAmqpBasicProperties
appId: newValue

	appId := GsAmqpBytes fromStringOrNil: newValue .
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_APP_ID_FLAG
		newValue: self appId
		offset: 168
%
category: 'Flags'
method: GsAmqpBasicProperties
clearFlag: aSymbol

self flags: (self flags bitAnd: (self class perform: aSymbol) bitInvert).
^ self uint32At: 0 put: self flags ; yourself
%
category: 'Accessing'
method: GsAmqpBasicProperties
clusterId
	^clusterId
%
category: 'Updating'
method: GsAmqpBasicProperties
clusterId: newValue

	clusterId := GsAmqpBytes fromStringOrNil: newValue.
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_CLUSTER_ID_FLAG
		newValue: self clusterId
		offset: 184
%
category: 'Accessing'
method: GsAmqpBasicProperties
contentEncoding
	^contentEncoding
%
category: 'Updating'
method: GsAmqpBasicProperties
contentEncoding: newValue

	contentEncoding := GsAmqpBytes fromStringOrNil: newValue.
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_CONTENT_ENCODING_FLAG
		newValue: self contentEncoding
		offset: 24
%
category: 'Accessing'
method: GsAmqpBasicProperties
contentType
	^contentType
%
category: 'Updating'
method: GsAmqpBasicProperties
contentType: newValue

	contentType := GsAmqpBytes fromStringOrNil: newValue.
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_CONTENT_TYPE_FLAG
		newValue: self contentType
		offset: 8
%
category: 'Accessing'
method: GsAmqpBasicProperties
correlationId
	^correlationId
%
category: 'Updating'
method: GsAmqpBasicProperties
correlationId: newValue

	correlationId := GsAmqpBytes fromStringOrNil: newValue.
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_CORELATION_ID_FLAG
		newValue: self correlationId
		offset: 64
%
category: 'Accessing'
method: GsAmqpBasicProperties
deliveryMode
	^deliveryMode
%
category: 'Updating'
method: GsAmqpBasicProperties
deliveryMode: newValue

	| flagName |
	flagName := #AMQP_BASIC_DELIVERY_MODE_FLAG.
	newValue _validateMin: 0 max: 2.
	deliveryMode := newValue.
	self uint8At: 56 put: newValue.
	^ newValue == 0
		ifTrue: [self clearFlag: flagName]
		ifFalse: [self setFlag: flagName].
%
category: 'Accessing'
method: GsAmqpBasicProperties
expiration
	^expiration
%
category: 'Updating'
method: GsAmqpBasicProperties
expiration: newValue

	expiration := GsAmqpBytes fromStringOrNil: newValue.
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_EXPIRATION_FLAG
		newValue: self expiration
		offset: 96
%
category: 'Accessing'
method: GsAmqpBasicProperties
flags
	^flags
%
category: 'Updating'
method: GsAmqpBasicProperties
flags: newValue

	newValue _validateMin: 0 max: 16rFFFFFFFF.
	flags := newValue
%
category: 'Accessing'
method: GsAmqpBasicProperties
headers
	^headers
%
category: 'Updating'
method: GsAmqpBasicProperties
headers: aGsAmqpTable

	| flagName |
	headers := aGsAmqpTable.
	flagName := #AMQP_BASIC_HEADERS_FLAG.
	aGsAmqpTable
		ifNil:
			[self
				clearFlag: flagName;
				uint32At: 40 put: 0;
				uint64At: 48 put: 0]
		ifNotNil:
			[self
				setFlag: flagName;
				uint32At: 40 put: aGsAmqpTable numEntries;
				uint64At: 48 put: aGsAmqpTable entriesAddress]
%
category: 'Initialization'
method: GsAmqpBasicProperties
initialize

	^self
		flags: 0 ;
		setDeliveryPersistent ;
		yourself
%
category: 'Initialization'
method: GsAmqpBasicProperties
initializeFromC

"Do NOT user setter methods here (except for #flags:) as we are populating Smalltalk state from C state.
Setter methods update both C state and ST state, which is not what we want when initializing from C."

	self flags: (self uint32At: 0). "Must be first so that #testFlag: is correct"
	(self testFlag: #AMQP_BASIC_CONTENT_TYPE_FLAG)
		ifTrue: [contentType := self stringFromAmqpBytesAtOffset: 8].
	(self testFlag: #AMQP_BASIC_CONTENT_ENCODING_FLAG)
		ifTrue: [contentEncoding := self stringFromAmqpBytesAtOffset: 24].
	(self testFlag: #AMQP_BASIC_HEADERS_FLAG)
		ifTrue: [headers := GsAmqpTable fromCPointer: self atOffset: 40 ].
	(self testFlag: #AMQP_BASIC_DELIVERY_MODE_FLAG)
		ifTrue: [deliveryMode := self uint8At: 56].
	(self testFlag: #AMQP_BASIC_PRIORITY_FLAG)
		ifTrue: [priority := self uint8At: 57].
	(self testFlag: #AMQP_BASIC_CORRELATION_ID_FLAG)
		ifTrue: [correlationId := self stringFromAmqpBytesAtOffset: 64].
	(self testFlag: #AMQP_BASIC_REPLY_TO_FLAG)
		ifTrue: [replyTo := self stringFromAmqpBytesAtOffset: 80].
	(self testFlag: #AMQP_BASIC_EXPIRATION_FLAG)
		ifTrue: [expiration := self stringFromAmqpBytesAtOffset: 96].
	(self testFlag: #AMQP_BASIC_MESSAGE_ID_FLAG)
		ifTrue: [messageId := self stringFromAmqpBytesAtOffset: 112].
	(self testFlag: #AMQP_BASIC_TIMESTAMP_FLAG)
		ifTrue: [timestamp := self uint64At: 128].
	(self testFlag: #AMQP_BASIC_TYPE_FLAG)
		ifTrue: [type := self stringFromAmqpBytesAtOffset: 136].
	(self testFlag: #AMQP_BASIC_USER_ID_FLAG)
		ifTrue: [amqpUserId := self stringFromAmqpBytesAtOffset: 152].
	(self testFlag: #AMQP_BASIC_APP_ID_FLAG)
		ifTrue: [appId := self stringFromAmqpBytesAtOffset: 168].
	(self testFlag: #AMQP_BASIC_CLUSTER_ID_FLAG)
		ifTrue: [clusterId := self stringFromAmqpBytesAtOffset: 184].
	^self
%
category: 'Accessing'
method: GsAmqpBasicProperties
messageId
	^messageId
%
category: 'Updating'
method: GsAmqpBasicProperties
messageId: newValue

	messageId := GsAmqpBytes fromStringOrNil: newValue.
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_MESSAGE_ID_FLAG
		newValue: self messageId
		offset: 112
%
category: 'Private'
method: GsAmqpBasicProperties
postUpdateAmqpBytesWithBitFlag: aSymbol newValue: value offset: offset
	"Method called when a store of a string or nil is done on the receiver and the stored string does NOT come from the C state.
Update the appropriate flag and store the AmqpBytes data in the C state. Return the receiver."

	value
		ifNil: 
			[self
				clearFlag: aSymbol;
				clearAmqpBytesAtOffset: offset]
		ifNotNil: 
			[value _validateClass: GsAmqpBytes.
			self
				setFlag: aSymbol;
				storeAmqpBytes: value atOffset: offset].
	^self
%
category: 'Accessing'
method: GsAmqpBasicProperties
priority
	^priority
%
category: 'Updating'
method: GsAmqpBasicProperties
priority: newValue

	| flagName |
	flagName := #AMQP_BASIC_PRIORITY_FLAG.
	newValue _validateMin: 0 max: 9.
	priority := newValue.
	self uint8At: 57 put: newValue.
	^ newValue == 0
		ifTrue: [self clearFlag: flagName]
		ifFalse: [self setFlag: flagName].
%
category: 'Accessing'
method: GsAmqpBasicProperties
replyTo
	^replyTo
%
category: 'Updating'
method: GsAmqpBasicProperties
replyTo: newValue

	replyTo := GsAmqpBytes fromStringOrNil: newValue.
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_REPLY_TO_FLAG
		newValue: self replyTo
		offset: 80
%
category: 'Delivery'
method: GsAmqpBasicProperties
setDeliveryNonPersistent
	^ self deliveryMode: self class AMQP_DELIVERY_NONPERSISTENT
%
category: 'Delivery'
method: GsAmqpBasicProperties
setDeliveryPersistent
	^ self deliveryMode: self class AMQP_DELIVERY_PERSISTENT
%
category: 'Flags'
method: GsAmqpBasicProperties
setFlag: aSymbol

self flags: (self flags bitOr: (self class perform: aSymbol)).
^ self uint32At: 0 put: self flags ; yourself
%
category: 'Flags'
method: GsAmqpBasicProperties
testFlag: aSymbol
	"Returns true if the flag is set, false if not"

	^0 ~~ (self flags bitAnd: (self class perform: aSymbol))
%
category: 'Accessing'
method: GsAmqpBasicProperties
timestamp
	^timestamp
%
category: 'Updating'
method: GsAmqpBasicProperties
timestamp: newValue

	| flagName |
	flagName := #AMQP_BASIC_TIMESTAMP_FLAG.
	timestamp := newValue.
	self uint64At: 128 put: newValue.
	^ newValue == 0
		ifTrue: [self clearFlag: flagName]
		ifFalse: [self setFlag: flagName].

%
category: 'Accessing'
method: GsAmqpBasicProperties
type
	^type
%
category: 'Updating'
method: GsAmqpBasicProperties
type: newValue
	type := GsAmqpBytes fromStringOrNil: newValue.
	^self
		postUpdateAmqpBytesWithBitFlag: #AMQP_BASIC_TYPE_FLAG
		newValue: self type
		offset: 136
%
! ------------------- Remove existing behavior from GsAmqpTableEntryArray
removeAllMethods GsAmqpTableEntryArray
removeAllClassMethods GsAmqpTableEntryArray
! ------------------- Class methods for GsAmqpTableEntryArray
category: 'Constants'
classmethod: GsAmqpTableEntryArray
elementsToBytes: elements

^ self sizeOfElement * elements
%
category: 'Instance Creation'
classmethod: GsAmqpTableEntryArray
fromMemoryReferenceIn: aCByteArray atOffset: offset elements: numElements

"Does not allocate new memory. References existing memory at an address contained in aCByteArray at the given offset."

	^(self
		fromMemoryReferenceIn: aCByteArray
		atOffset: offset
		sizeInBytes: (self elementsToBytes: numElements)
		initializeFromC: false)
		elements: (Array new: numElements);
		initializeFromC;
		yourself
%
category: 'Instance Creation'
classmethod: GsAmqpTableEntryArray
new

"Use new: instead "
^ self shouldNotImplement: #new
%
category: 'Instance Creation'
classmethod: GsAmqpTableEntryArray
new: numElements

	| bytes result |
	bytes := numElements * self sizeOfElement .
	result := self gcMalloc: bytes.
	^result
		initialize;
		elements: (Array new: numElements);
		yourself
%
category: 'Instance Creation'
classmethod: GsAmqpTableEntryArray
newFromArrayOfPairs: array

	| size |
	(size := array size) even
		ifFalse: [self error: 'array of pairs size must be even'].
	^(self new: size // 2)
		initialize;
		buildFromArrayOfPairs: array;
		yourself
%
category: 'Instance Creation'
classmethod: GsAmqpTableEntryArray
newFromDictionary: dict

	^(self new: dict size)
		initialize;
		buildFromDictionary: dict;
		yourself
%
category: 'Instance Creation'
classmethod: GsAmqpTableEntryArray
newFromKeys: keyArray values: valueArray

	| size |
	(size := keyArray size) == valueArray size
		ifFalse: [self error: 'size of arrays for keys and values must match'].
	^(self new: size)
		initialize;
		buildFromKeys: keyArray values: valueArray;
		yourself
%
category: 'Constants'
classmethod: GsAmqpTableEntryArray
sizeOfElement

^ GsAmqpTableEntry sizeInC
%
! ------------------- Instance methods for GsAmqpTableEntryArray
category: 'Adding'
method: GsAmqpTableEntryArray
add: anElement

^ self shouldNotImplement: #add:
%
category: 'Adding'
method: GsAmqpTableEntryArray
addAll: aCollection

^ self shouldNotImplement: #addAll:
%
category: 'Accessing'
method: GsAmqpTableEntryArray
at: index

^self elements at: index
%
category: 'Updating'
method: GsAmqpTableEntryArray
at: oneBasedIdx put: obj

	| offset  |

"Don't allow the elements array to grow"
	oneBasedIdx > elements size
		ifTrue: [self _errorIndexOutOfRange: oneBasedIdx].
"Store reference to obj to protect from GC"
	self elements at: oneBasedIdx put: obj.
"Compute C offset in receiver"
	offset := self offsetForElementIndex: oneBasedIdx.
	obj
		ifNil:
			[self "Clear C memory"
				memset: 0
				from: offset
				to: (self sizeOfElement - 1)]
		ifNotNil:
			[obj _validateClass: GsAmqpTableEntry.
			self "Copy element to C memory"
				copyBytesFrom: obj
				from: 1
				to: self sizeOfElement
				into: offset]
%
category: 'Building'
method: GsAmqpTableEntryArray
buildFromArrayOfPairs: array

	| index |
	index := 0.
	1 to: array size
		by: 2
		do:
			[:n |
			index := index + 1.
			self at: index
				put: (GsAmqpTableEntry newForKey: (array at: n) value: (array at: n + 1))].
	^self
%
category: 'Building'
method: GsAmqpTableEntryArray
buildFromDictionary: dict

| index |
index := 0.
dict keysAndValuesDo:[:k :v|
	index := index + 1.
	self at: index put: (GsAmqpTableEntry newForKey: k value: v).
].
%
category: 'Building'
method: GsAmqpTableEntryArray
buildFromKeys: keysArray values: valuesArray

	| index |
	index := 0.
	1 to: keysArray size
		do:
			[:n |
			index := index + 1.
			self at: index
				put: (GsAmqpTableEntry newForKey: (keysArray at: n)
						value: (valuesArray at: n))].
	^self
%
category: 'Accessing'
method: GsAmqpTableEntryArray
elements
	^elements
%
category: 'Updating'
method: GsAmqpTableEntryArray
elements: newValue
	elements := newValue
%
category: 'Initializing'
method: GsAmqpTableEntryArray
initializeFromC

1 to: self elements size do:[:n|
	self elements at: n put: (GsAmqpTableEntry fromCPointer: self atOffset: (self offsetForElementIndex: n)) ].
^ self
%
category: 'Accessing'
method: GsAmqpTableEntryArray
numElements

^ elements size
%
category: 'Converting'
method: GsAmqpTableEntryArray
offsetForElementIndex: oneBasedIndex

^ (oneBasedIndex - 1) * self sizeOfElement
%
category: 'Constants'
method: GsAmqpTableEntryArray
sizeOfElement

^ self class sizeOfElement
%
! ------------------- Remove existing behavior from GsAmqpFieldValue
removeAllMethods GsAmqpFieldValue
removeAllClassMethods GsAmqpFieldValue
! ------------------- Class methods for GsAmqpFieldValue
category: 'Converting'
classmethod: GsAmqpFieldValue
amqpFieldKindForObject: obj

	^obj _isInteger
		ifTrue: [self AMQP_FIELD_KIND_I64]
		ifFalse:
			[ | cls |
			cls := obj class.
			cls == Boolean
				ifTrue: [self AMQP_FIELD_KIND_BOOLEAN]
				ifFalse:
					[cls isBytes
						ifTrue: [self AMQP_FIELD_KIND_UTF8]
						ifFalse: [self error: 'Invalid object']]]
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_ARRAY

^ $A asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_BOOLEAN

^ $t asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_BYTES

^ $x asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_DECIMAL

^ $D asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_F32

^ $f asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_F64

^ $d asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_I16

^ $s asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_I32

^ $I asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_I64

^ $l asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_I8

^ $b asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_TABLE

^ $F asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_TIMESTAMP

^ $T asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_U16

^ $u asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_U32

^ $i asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_U64

^ $L asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_U8

^ $B asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_UTF8

^ $S asInteger
%
category: 'Constants (Field Kinds)'
classmethod: GsAmqpFieldValue
AMQP_FIELD_KIND_VOID

^ $V asInteger
%
category: 'Instance Creation'
classmethod: GsAmqpFieldValue
newForObject: anObject

"anObject must be a Boolean, SmallInteger or String"

^ (self new)
	 initialize ;
	setValue: anObject ;
	yourself
%
category: 'Constants'
classmethod: GsAmqpFieldValue
sizeInC

^ 24
%
! ------------------- Instance methods for GsAmqpFieldValue
category: 'Initialization'
method: GsAmqpFieldValue
initializeFromC

	^ self 
			kind: (self uint8At: 0) ;
	 		value: (self valueIsBoolean
				ifTrue: [self booleanAtOffset: 8]
				ifFalse:
					[self valueIsString
						ifTrue:
							[GsAmqpBytes fromCPointer: self atOffset: 8]
						ifFalse:
							[self valueIsInteger
								ifTrue: [self int64At: 8]
								ifFalse: [self error: 'Unsupported value kind ' , self kind asString]]]) ;
			yourself
%
category: 'Accessing'
method: GsAmqpFieldValue
kind
	^kind
%
category: 'Private'
method: GsAmqpFieldValue
kind: newValue
	kind := newValue
%
category: 'Updating'
method: GsAmqpFieldValue
setValue: aValue

"Currently only Booleans, Integers and Strings are supported for values"
	value := aValue. "Reference the incoming arg. We may override this later"
	aValue
		ifNil: [self memset: 0 from: 0 to: -1]
		ifNotNil:
			[aValue _isInteger
				ifTrue: [self storeInteger: aValue]
				ifFalse:
					[aValue class == Boolean
						ifTrue: [self storeBoolean: aValue]
						ifFalse: [self storeStringAsUtf8: aValue]]].
	^self
%
category: 'Updating'
method: GsAmqpFieldValue
storeBoolean: aBoolean

^ self uint8At: 0 put: (kind := self class AMQP_FIELD_KIND_BOOLEAN) ;
	uint64At: 8 put: aBoolean asBit ;
	yourself
%
category: 'Updating'
method: GsAmqpFieldValue
storeInteger: anInt

^ self uint8At: 0 put: (kind := self class AMQP_FIELD_KIND_I64) ;
	int64At: 8 put: anInt ;
	yourself
%
category: 'Updating'
method: GsAmqpFieldValue
storeStringAsUtf8: aString

"Create a new GsAmqpBytes object. We must reference it so it does not get garbage collected."

value :=GsAmqpBytes fromStringEncodeAsUtf8: aString.
^ self uint8At: 0 put: (kind := self class AMQP_FIELD_KIND_UTF8) ;
	uint64At: 8 put: value len ;
	uint64At: 16 put: value bytesAddress ;
	yourself
%
category: 'Accessing'
method: GsAmqpFieldValue
value
	^value
%
category: 'Private'
method: GsAmqpFieldValue
value: newValue
	value := newValue
%
category: 'Testing'
method: GsAmqpFieldValue
valueIsBoolean

| myKind |
myKind := self kind.
myKind _validateClass: SmallInteger.
^ myKind == self class AMQP_FIELD_KIND_BOOLEAN
%
category: 'Testing'
method: GsAmqpFieldValue
valueIsInteger

| myKind |
(myKind := self kind) _validateClass: SmallInteger. 
"Hard code values for performance"
(myKind == 66 or:[ myKind == 73 ]) ifTrue:[ ^ true ].
(myKind == 76 or:[ myKind == 98 ]) ifTrue:[ ^ true ].
(myKind == 105 or:[ myKind == 108 ]) ifTrue:[ ^ true ].
(myKind == 115 or:[ myKind == 117 ]) ifTrue:[ ^ true ].
^ false

"Note: the above implementation is approx 4X faster than this alternative:

^ { 66  . 73 . 76 . 98 . 105 . 108 . 115 . 117 } includesIdentical: myKind
"
%
category: 'Testing'
method: GsAmqpFieldValue
valueIsString

| myKind |
myKind := self kind.
myKind _validateClass: SmallInteger.
^ myKind == self class AMQP_FIELD_KIND_UTF8
%
! ------------------- Remove existing behavior from GsAmqpHeadersExchange
removeAllMethods GsAmqpHeadersExchange
removeAllClassMethods GsAmqpHeadersExchange
! ------------------- Class methods for GsAmqpHeadersExchange
category: 'Instance Creation'
classmethod: GsAmqpHeadersExchange
declareWithConnection: conn name: exchgName channel: channelIdArg durable: durable autoDelete: autoDelete

	^self
		declareWithConnection: conn
		name: exchgName
		type: 'headers'
		channel: channelIdArg
		durable: durable
		autoDelete: autoDelete
%
category: 'Headers Generation'
classmethod: GsAmqpHeadersExchange
generateMessagePropertiesFromHeadersDictionary: dict

| table props |
table := GsAmqpTable newFromDictionary: dict.
props := GsAmqpBasicProperties new.
props headers: table.
^ props

%
category: 'Headers Generation'
classmethod: GsAmqpHeadersExchange
generateMessagePropertiesFromHeadersKeys: keys values: values

| table props |
table := GsAmqpTable newFromKeys: keys values: values.
props := GsAmqpBasicProperties new.
props headers: table.
^ props

%
! ------------------- Instance methods for GsAmqpHeadersExchange
category: 'Exchange Kind'
method: GsAmqpHeadersExchange
exchangeKind

^ #headers
%
! ------------------- Remove existing behavior from GsAmqpTopicExchange
removeAllMethods GsAmqpTopicExchange
removeAllClassMethods GsAmqpTopicExchange
! ------------------- Class methods for GsAmqpTopicExchange
category: 'Instance Creation'
classmethod: GsAmqpTopicExchange
declareWithConnection: conn name: exchgName channel: channelIdArg durable: durable autoDelete: autoDelete

	^self
		declareWithConnection: conn
		name: exchgName
		type: 'topic'
		channel: channelIdArg
		durable: durable
		autoDelete: autoDelete
%
! ------------------- Instance methods for GsAmqpTopicExchange
category: 'Exchange Kind'
method: GsAmqpTopicExchange
exchangeKind

^ #topic
%
! ------------------- Remove existing behavior from GsAmqpFanoutExchange
removeAllMethods GsAmqpFanoutExchange
removeAllClassMethods GsAmqpFanoutExchange
! ------------------- Class methods for GsAmqpFanoutExchange
category: 'Instance Creation'
classmethod: GsAmqpFanoutExchange
declareWithConnection: conn name: exchgName channel: channelIdArg durable: durable autoDelete: autoDelete

	^self
		declareWithConnection: conn
		name: exchgName
		type: 'fanout'
		channel: channelIdArg
		durable: durable
		autoDelete: autoDelete
%
category: 'Instance Creation'
classmethod: GsAmqpFanoutExchange
declareWithConnection: conn name: exchgName channel: channelIdArg durable: durable autoDelete: autoDelete internal: internal

^ self declareWithConnection: conn name: exchgName type: 'fanout' channel: channelIdArg durable: durable autoDelete: autoDelete internal: internal
%
! ------------------- Instance methods for GsAmqpFanoutExchange
category: 'Exchange Kind'
method: GsAmqpFanoutExchange
exchangeKind

^ #fanout
%
category: 'Publishing'
method: GsAmqpFanoutExchange
publishMessage: msg mandatory: mandatory properties: props

^ self publishMessage: msg routingKey: nil mandatory: mandatory properties: props
%
! ------------------- Remove existing behavior from GsAmqpDirectExchange
removeAllMethods GsAmqpDirectExchange
removeAllClassMethods GsAmqpDirectExchange
! ------------------- Class methods for GsAmqpDirectExchange
category: 'Instance Creation'
classmethod: GsAmqpDirectExchange
declareWithConnection: conn name: exchgName channel: channelIdArg durable: durable autoDelete: autoDelete

	^self
		declareWithConnection: conn
		name: exchgName
		type: 'direct'
		channel: channelIdArg
		durable: durable
		autoDelete: autoDelete
%
category: 'Defaults'
classmethod: GsAmqpDirectExchange
defaultName

^ 'amq.direct'
%
! ------------------- Instance methods for GsAmqpDirectExchange
category: 'Exchange Kind'
method: GsAmqpDirectExchange
exchangeKind

^ #direct
%
! ------------------- Remove existing behavior from GsAmqpTableEntry
removeAllMethods GsAmqpTableEntry
removeAllClassMethods GsAmqpTableEntry
! ------------------- Class methods for GsAmqpTableEntry
category: 'Constants'
classmethod: GsAmqpTableEntry
keyOffset

^ 0
%
category: 'Instance Creation'
classmethod: GsAmqpTableEntry
newForKey: keyString value: anObject

	^(self new)
		initialize;
		setKey: keyString;
		setValue: (GsAmqpFieldValue newForObject: anObject) ;
		yourself
%
category: 'Constants'
classmethod: GsAmqpTableEntry
sizeInC

^ 40
%
category: 'Constants'
classmethod: GsAmqpTableEntry
valueOffset

^ 16
%
! ------------------- Instance methods for GsAmqpTableEntry
category: 'Initializing'
method: GsAmqpTableEntry
initializeFromC

	self
		key: (GsAmqpBytes fromCPointer: self);
		value: (GsAmqpFieldValue fromCPointer: self atOffset: 16);
		yourself
%
category: 'Accessing'
method: GsAmqpTableEntry
key
	^key
%
category: 'Private'
method: GsAmqpTableEntry
key: newValue
	key := newValue
%
category: 'Constants'
method: GsAmqpTableEntry
keyOffset

^ self class keyOffset
%
category: 'Updating'
method: GsAmqpTableEntry
setKey: aStringOrNil

	aStringOrNil
		ifNil:
			[self key: nil ;
				memset: 0
				from: self keyOffset
				to: self valueOffset - 1]
		ifNotNil:
			[ aStringOrNil _validateClass: String .
			self key: (GsAmqpBytes fromString: aStringOrNil) ;
				uint64At: self keyOffset put: key len;
				uint64At: self keyOffset + 8 put: key bytesAddress].
	^self
%
category: 'Updating'
method: GsAmqpTableEntry
setValue: aGsAmqpFieldValueOrNil

	aGsAmqpFieldValueOrNil
		ifNil:
			[value := nil.
			self memset: 0 from: self class valueOffset to: -1 "clear C state" ]
		ifNotNil:
			[aGsAmqpFieldValueOrNil _validateClass: GsAmqpFieldValue.
			self value: aGsAmqpFieldValueOrNil ;
			 "now copy C state from newValue into receiver"
				copyBytesFrom: aGsAmqpFieldValueOrNil
				from: 1
				to: aGsAmqpFieldValueOrNil class sizeInC
				into: self class valueOffset].
	^self
%
category: 'Accessing'
method: GsAmqpTableEntry
value
	^value
%
category: 'Private'
method: GsAmqpTableEntry
value: newValue
	value := newValue
%
category: 'Constants'
method: GsAmqpTableEntry
valueOffset

^ self class valueOffset
%
! ------------------- Remove existing behavior from GsAmqpConfirmedMessage
removeAllMethods GsAmqpConfirmedMessage
removeAllClassMethods GsAmqpConfirmedMessage
! ------------------- Class methods for GsAmqpConfirmedMessage
category: 'Instance Creation'
classmethod: GsAmqpConfirmedMessage
newWithMessage: aString publisher: aGsAmqpConfirmedMessagePublisher

	^(self new initialize)
		message: aString;
		publisher: aGsAmqpConfirmedMessagePublisher;
		yourself
%
! ------------------- Instance methods for GsAmqpConfirmedMessage
category: 'Assertions'
method: GsAmqpConfirmedMessage
assertConfirmed

^ self isConfirmed ifTrue:[ true] ifFalse:[ self raiseUnexpectedStateError: #confirmed ]
%
category: 'Assertions'
method: GsAmqpConfirmedMessage
assertPublished

^ self isPublished ifTrue:[ true] ifFalse:[ self raiseUnexpectedStateError: #published ]
%
category: 'Assertions'
method: GsAmqpConfirmedMessage
assertRejected

^ self isRejected ifTrue:[ true] ifFalse:[ self raiseUnexpectedStateError: #rejected ]
%
category: 'Assertions'
method: GsAmqpConfirmedMessage
assertReturned

^ self isReturned ifTrue:[ true] ifFalse:[ self raiseUnexpectedStateError: #returned ]
%
category: 'Assertions'
method: GsAmqpConfirmedMessage
assertUnpublished

^ self isUnpublished ifTrue:[ true] ifFalse:[ self raiseUnexpectedStateError: #unpublished ]
%
category: 'Accessing'
method: GsAmqpConfirmedMessage
id
	^id
%
category: 'Updating'
method: GsAmqpConfirmedMessage
id: newValue
	id := newValue
%
category: 'Initialization'
method: GsAmqpConfirmedMessage
initialize

	^self setUnpublished
%
category: 'Testing'
method: GsAmqpConfirmedMessage
isConfirmed

^ self state == #confirmed
%
category: 'Testing'
method: GsAmqpConfirmedMessage
isPublished

^ self state == #published
%
category: 'Testing'
method: GsAmqpConfirmedMessage
isRejected

^ self state == #rejected
%
category: 'Testing'
method: GsAmqpConfirmedMessage
isReturned

^ self state == #returned
%
category: 'Testing'
method: GsAmqpConfirmedMessage
isUnpublished

^ self state == #unpublished
%
category: 'Accessing'
method: GsAmqpConfirmedMessage
message
	^message
%
category: 'Updating'
method: GsAmqpConfirmedMessage
message: newValue
	message := newValue
%
category: 'Accessing'
method: GsAmqpConfirmedMessage
publisher
	^publisher
%
category: 'Updating'
method: GsAmqpConfirmedMessage
publisher: newValue
	publisher := newValue
%
category: 'Assertions'
method: GsAmqpConfirmedMessage
raiseUnexpectedStateError: aSymbol

^ self error: ('Unexpected message state (expected ', aSymbol asString, ')')
%
category: 'Private'
method: GsAmqpConfirmedMessage
setConfirmed

^ self state: #confirmed ; yourself
%
category: 'Publishing'
method: GsAmqpConfirmedMessage
setPublished: msgId

	^self
		state: #published;
		id: msgId ;
		yourself
%
category: 'Private'
method: GsAmqpConfirmedMessage
setRejected

^ self state: #rejected ; yourself
%
category: 'Private'
method: GsAmqpConfirmedMessage
setReturned

^ self state: #returned ; yourself
%
category: 'Private'
method: GsAmqpConfirmedMessage
setUnpublished

^ self state: #unpublished ; yourself
%
category: 'Accessing'
method: GsAmqpConfirmedMessage
state
	^state
%
category: 'Updating'
method: GsAmqpConfirmedMessage
state: newValue
	state := newValue
%
! ------------------- Remove existing behavior from GsAmqpBasicAck
removeAllMethods GsAmqpBasicAck
removeAllClassMethods GsAmqpBasicAck
! ------------------- Class methods for GsAmqpBasicAck
category: 'Constants'
classmethod: GsAmqpBasicAck
sizeInC

^ 16
%
! ------------------- Instance methods for GsAmqpBasicAck
category: 'Accessing'
method: GsAmqpBasicAck
deliveryTag
	^deliveryTag
%
category: 'Updating'
method: GsAmqpBasicAck
deliveryTag: newValue
	deliveryTag := newValue
%
category: 'Initialization'
method: GsAmqpBasicAck
initializeFromC

^ self deliveryTag: (self uint64At: 0);
	multiple: (self booleanAtOffset: 8);
	yourself
%
category: 'Accessing'
method: GsAmqpBasicAck
multiple
	^multiple
%
category: 'Updating'
method: GsAmqpBasicAck
multiple: newValue
	multiple := newValue
%
! ------------------- Remove existing behavior from GsAmqpConnectionClose
removeAllMethods GsAmqpConnectionClose
removeAllClassMethods GsAmqpConnectionClose
! ------------------- Class methods for GsAmqpConnectionClose
category: 'Constants'
classmethod: GsAmqpConnectionClose
sizeInC

^ 32
%
! ------------------- Instance methods for GsAmqpConnectionClose
category: 'Accessing'
method: GsAmqpConnectionClose
classId
	^classId
%
category: 'Updating'
method: GsAmqpConnectionClose
classId: newValue
	classId := newValue
%
category: 'Initializing'
method: GsAmqpConnectionClose
initializeFromC

^ self replyCode: (self uint16At: 0) ;
	replyText: (self stringFromAmqpBytesAtOffset: 8) ;
	classId: (self uint16At: 24) ;
	methodId: (self uint16At: 26) ;
	yourself

%
category: 'Accessing'
method: GsAmqpConnectionClose
methodId
	^methodId
%
category: 'Updating'
method: GsAmqpConnectionClose
methodId: newValue
	methodId := newValue
%
category: 'Accessing'
method: GsAmqpConnectionClose
replyCode
	^replyCode
%
category: 'Updating'
method: GsAmqpConnectionClose
replyCode: newValue
	replyCode := newValue
%
category: 'Accessing'
method: GsAmqpConnectionClose
replyText
	^replyText
%
category: 'Updating'
method: GsAmqpConnectionClose
replyText: newValue
	replyText := newValue
%
! ------------------- Remove existing behavior from GsAmqpConfirmedMessagePublisher
removeAllMethods GsAmqpConfirmedMessagePublisher
removeAllClassMethods GsAmqpConfirmedMessagePublisher
! ------------------- Class methods for GsAmqpConfirmedMessagePublisher
category: 'Instance Creation'
classmethod: GsAmqpConfirmedMessagePublisher
newForConnection: conn exchange: exchg routingKey: routingKey mandatory: mandatory

	^(self new)
		connection: conn;
		exchange: exchg;
		routingKey: routingKey;
		mandatory: mandatory ;
		initialize
%
! ------------------- Instance methods for GsAmqpConfirmedMessagePublisher
category: 'Private'
method: GsAmqpConfirmedMessagePublisher
addPublishedMessage: aGsAmqpConfirmedMessage

	| msgId |
	msgId := self incrementMessageCount .
	aGsAmqpConfirmedMessage setPublished: msgId.
	self publishedMessages add: aGsAmqpConfirmedMessage.
	self messageDictionary at: msgId put: aGsAmqpConfirmedMessage.
	^ self
%
category: 'Querying'
method: GsAmqpConfirmedMessagePublisher
allMessageUpToIncludingId: anInt

"Get all messags with an id less than or equal to anInt"

^ (self publishedMessages select:[:e| e id <= anInt ]) asArray
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
autoRemoveConfirmed
	^autoRemoveConfirmed
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
autoRemoveConfirmed: newValue
	autoRemoveConfirmed := newValue
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
basicPollForConfirmsNoWaitIntoMethodFrame: methodFrame resultInto: result
	"Poll for publisher confirms (acks, nacks, returns, rejects) until there are no more outstanding responses or we time out waiting."

	| didWork |
	didWork := false.
	[true] whileTrue:
			[| gotDataThisTime |
			self hasUnconfirmedMessages ifFalse: [^ didWork]. "Early exit for no more outstanding acks"
			(gotDataThisTime := self primPollForConfirmsWithTimeoutMs: 0
						methodFrame: methodFrame)
					ifTrue:  "Got a frame, process it"
						[didWork := true.
						self processFrame: methodFrame addMessageTo: result.
						methodFrame initializeForReuse]
					ifFalse: [^ didWork] "no (more?) work available, so we are done."
].
	self error: 'Should not be here!'.
	^didWork
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
basicPollForConfirmsWithTimeoutMs: ms methodFrame: methodFrame resultInto: result
	"Poll for publisher confirms (acks, nacks, returns, rejects). Answer true if we received a message, false if not, maybe after waiting if ms > 0"

	self hasUnconfirmedMessages ifFalse: [^false].	"Early exit for no more outstanding acks"
	^(self primPollForConfirmsWithTimeoutMs: ms methodFrame: methodFrame)
		ifTrue:
			["Got a frame, process it"
			self processFrame: methodFrame addMessageTo: result.
			methodFrame initializeForReuse.
			true]
		ifFalse: [false]	"no (more?) work available, so we are done."
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
channel
	^channel
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
channel: newValue
	channel := newValue
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
confirmedMessages
	^confirmedMessages
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
confirmedMessages: newValue
	confirmedMessages := newValue
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
connection
	^connection
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
connection: newValue
	connection := newValue
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
exchange
	^exchange
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
exchange: newValue
	exchange := newValue
%
category: 'Testing'
method: GsAmqpConfirmedMessagePublisher
hasUnconfirmedMessages

^ self messagesNotConfirmedCount > 0
%
category: 'Private'
method: GsAmqpConfirmedMessagePublisher
incrementMessageCount

self messageCount: (self messageCount + 1).
^ self messageCount
%
category: 'Initialization'
method: GsAmqpConfirmedMessagePublisher
initialize

	| chan |
	chan := self connection openNextChannel.
	self connection enablePublisherConfirmsForChannel: chan.
	^self
		channel: chan;
		messageCount: 0;
		publishedMessages: IdentitySet new;
		confirmedMessages: IdentitySet new;
		rejectedMessages: IdentitySet new;
		returnedMessages: IdentitySet new;
		messageDictionary: IntegerKeyValueDictionary new;
		autoRemoveConfirmed: true ;
		yourself
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
mandatory
	^mandatory
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
mandatory: newValue
	mandatory := newValue
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
messageCount
	^messageCount
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
messageCount: newValue
	messageCount := newValue
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
messageDictionary
	^messageDictionary
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
messageDictionary: newValue
	messageDictionary := newValue
%
category: 'Querying'
method: GsAmqpConfirmedMessagePublisher
messageForId: anInt

^ self messageDictionary at: anInt
%
category: 'Querying'
method: GsAmqpConfirmedMessagePublisher
messagesNotConfirmedCount
	^ publishedMessages size
%
category: 'Testing'
method: GsAmqpConfirmedMessagePublisher
noMoreUnconfirmedMessages

^ self hasUnconfirmedMessages not
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
pollForConfirmsWithTimeoutMs: ms

^ self pollForConfirmsWithTimeoutMs: ms getAtMost: SmallInteger maximumValue
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
pollForConfirmsWithTimeoutMs: ms getAtMost: maxConfirms

	| methodFrame result sys |
	sys := System .
	result := Array new.
	methodFrame := GsAmqpFrame newWithConnection: self connection.

	"Simple case: do not loop/retry if caller wants no wait or wai forever"
	ms <= 0
		ifTrue:
			[self
				basicPollForConfirmsWithTimeoutMs: ms
				methodFrame: methodFrame
				resultInto: result]
		ifFalse:
			[| nowMs endTimeMs done |
			nowMs := sys _timeMs.
			endTimeMs := nowMs + ms.
			done := false.
			[done] whileFalse:
					[| timeLeftMs |
					(timeLeftMs := endTimeMs - nowMs) > 0
						ifTrue:
							[self
								basicPollForConfirmsWithTimeoutMs: timeLeftMs
								methodFrame: methodFrame
								resultInto: result].
					done := (self noMoreUnconfirmedMessages or:[result size >= maxConfirms])
								or: [(nowMs := sys _timeMs) >= endTimeMs]]].
	^result
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
primPollForConfirmsWithTimeoutMs: ms methodFrame: methodFrame

"Poll for a method frame. Return true if we received one, false if we timed out."
	^self connection
		getFrameInto: methodFrame
		withTimeoutMs: ms
		errorOnTimeout: false
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
processBasicAck: aGsAmqpMethod addMessageTo: anArray

	| ack id msgs multiple |
	ack := aGsAmqpMethod methodObject.
	id := ack deliveryTag.	"aGsAmqpBasicAck"
	multiple := ack multiple.
"uncomment next line for debugging"
"	multiple ifTrue:[ GsFile gciLogServer: ('Got multiple: all msgs up to and including ', id asString)]."
	msgs := multiple "Multiple == true means all messages up to and include id are acknowleged"
				ifTrue: [self allMessageUpToIncludingId: id]
				ifFalse: [Array with: (self messageForId: id)].
	msgs do:
			[:msg |
			msg setConfirmed.	"Update message state"
			self publishedMessages remove: msg.	"Remove from published"
			self autoRemoveConfirmed
				ifTrue: [self removeMessage: msg]
				ifFalse: [self confirmedMessages add: msg]	"Add to confirmed if configured, otherwise drop on floor"].
	anArray addAll: msgs.
	^self
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
processBasicNack: aGsAmqpMethod addMessageTo: anArray

	| nack id msgs multiple |
	nack := aGsAmqpMethod methodObject.
	id := nack deliveryTag.	"aGsAmqpBasicNack"
	multiple := nack multiple.
	msgs := multiple
				ifTrue: [self allMessageUpToIncludingId: id]
				ifFalse: [Array with: (self messageForId: id)].	"Multiple == true means all messages up to and include id are acknowleged"
	self processRejectedMessages: msgs.
	anArray addAll: msgs.
	^self
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
processBasicReject: aGsAmqpMethod addMessageTo: anArray

"Reject is the same as nack except only refers to 1 message, never multple"

	| reject id msgs |
	reject := aGsAmqpMethod methodObject.
	id := reject deliveryTag.	"aGsAmqpBasicNack"
	msgs := Array with: (self messageForId: id).
	self processRejectedMessages: msgs.
	anArray addAll: msgs.
	^self
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
processBasicReturn: aGsAmqpMethod addMessageTo: anArray

	| return id msg  methodFrame returnedMsg |
	return := aGsAmqpMethod methodObject.
	"Read the returned message and discard it"
	returnedMsg := self connection readMessageInto: nil channel: self channel.
"Should be an ack or nack next"
	methodFrame := GsAmqpFrame newWithConnection: self connection.
	self connection getFrameInto: methodFrame withTimeoutMs: 1000 errorOnTimeout: true. "should not timeout!"
	id := methodFrame payload methodObject deliveryTag. "Get the id and put the message in the correct state"
	msg := self messageForId: id.
	msg setReturned.
	self publishedMessages remove: msg.
	self returnedMessages add: msg.
	^ self
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
processFrame: aGsAmqpFrame addMessageTo: anArray

	| payload |
	aGsAmqpFrame isFrameMethod
		ifFalse: [self error: 'expected a method frame'].
	payload := aGsAmqpFrame payload.
	payload isBasicAck
		ifTrue: [self processBasicAck: payload addMessageTo: anArray]
		ifFalse:
			[payload isBasicNack
				ifTrue: [self processBasicNack: payload addMessageTo: anArray]
				ifFalse:
					[payload isBasicReject
						ifTrue: [self processBasicReject: payload addMessageTo: anArray]
						ifFalse:
							[payload isBasicReturn
								ifTrue: [self processBasicReturn: payload addMessageTo: anArray]
								ifFalse: [self error: 'unexpected payload kind']]]].
aGsAmqpFrame initializeForReuse.
^ self
%
category: 'Polling'
method: GsAmqpConfirmedMessagePublisher
processRejectedMessages: anArray

	anArray do:
			[:msg |
			msg setRejected.	"Update message state"
			self publishedMessages remove: msg.	"Remove from published"
			self rejectedMessages add: msg].	"Add to rejected"

	^self
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
publishedMessages
	^publishedMessages
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
publishedMessages: newValue
	publishedMessages := newValue
%
category: 'Publishing'
method: GsAmqpConfirmedMessagePublisher
publishMessage: aGsAmqpConfirmedMessage

	aGsAmqpConfirmedMessage _validateClass: GsAmqpConfirmedMessage.
	self connection
		publishMessage: aGsAmqpConfirmedMessage message
		channel: self channel
		exchange: self exchange
		routingKey: self routingKey
		mandatory: self mandatory
		properties: nil.
	^ self addPublishedMessage: aGsAmqpConfirmedMessage .
%
category: 'Publishing'
method: GsAmqpConfirmedMessagePublisher
publishMessageString: aString

| newMsg |
newMsg := GsAmqpConfirmedMessage newWithMessage: aString publisher: self.
 self publishMessage: newMsg.
^ newMsg
%
category: 'Querying'
method: GsAmqpConfirmedMessagePublisher
rejectedMessageCount
	^rejectedMessages size
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
rejectedMessages
	^rejectedMessages
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
rejectedMessages: newValue
	rejectedMessages := newValue
%
category: 'Removing'
method: GsAmqpConfirmedMessagePublisher
removeMessage: aGsAmqpConfirmedMessage

self publishedMessages removeIfPresent: aGsAmqpConfirmedMessage.
self confirmedMessages removeIfPresent: aGsAmqpConfirmedMessage.
self rejectedMessages removeIfPresent: aGsAmqpConfirmedMessage.
self returnedMessages removeIfPresent: aGsAmqpConfirmedMessage.
self messageDictionary removeKey: aGsAmqpConfirmedMessage id otherwise: nil.
^ self
%
category: 'Querying'
method: GsAmqpConfirmedMessagePublisher
returnedMessageCount
	^returnedMessages size
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
returnedMessages
	^returnedMessages
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
returnedMessages: newValue
	returnedMessages := newValue
%
category: 'Accessing'
method: GsAmqpConfirmedMessagePublisher
routingKey
	^routingKey
%
category: 'Updating'
method: GsAmqpConfirmedMessagePublisher
routingKey: newValue
	routingKey := newValue
%
category: 'Querying'
method: GsAmqpConfirmedMessagePublisher
undeliverableMessageCount

^ self rejectedMessageCount + self returnedMessageCount
%
! ------------------- Remove existing behavior from GsRabbitMqError
removeAllMethods GsRabbitMqError
removeAllClassMethods GsRabbitMqError
! ------------------- Class methods for GsRabbitMqError
category: 'Instance Creation'
classmethod: GsRabbitMqError
newFromChannelClose: aGsAmqpConnectionClose

^ self new initializeFromChannelClosedMethod: aGsAmqpConnectionClose
%
category: 'Instance Creation'
classmethod: GsRabbitMqError
newFromConnectionClose: aGsAmqpConnectionClose

^ self new initializeFromConnectionClosedMethod: aGsAmqpConnectionClose
%
category: 'Instance Creation'
classmethod: GsRabbitMqError
newFromRpcReply: reply forOperation: aString

	^reply isSuccess
		ifTrue:
			[self error: 'Attempt to raise an exception from a successful operation']
		ifFalse: [self new initializeFromReply: reply forOperation: aString]
%
category: 'Instance Creation'
classmethod: GsRabbitMqError
newWithStatusCode: status library: library
	"GsRabbitMqError newWithStatusCode: -1 library: GsLibRabbitMq new"

	| result |
	result := self new initialize.
	^result
		amqpErrorCode: status;
		details: (library amqp_error_string2_: status);
		yourself
%
category: 'Instance Creation'
classmethod: GsRabbitMqError
signalForOperation: aString

^self signal: ('A RabbitMQ operation failed: ', aString asString)
%
category: 'Signaling'
classmethod: GsRabbitMqError
signalWithErrorCode: anInt library: aLib

^ (self newWithStatusCode: anInt library: aLib) signal
%
! ------------------- Instance methods for GsRabbitMqError
category: 'Accessing'
method: GsRabbitMqError
amqpErrorCode
	^amqpErrorCode
%
category: 'Updating'
method: GsRabbitMqError
amqpErrorCode: newValue
	amqpErrorCode := newValue
%
category: 'Formatting'
method: GsRabbitMqError
buildErrorStringForOperation: aString with: details

^'RabbitMQ call ', aString asString, ' failed ', details
%
category: 'Initialize'
method: GsRabbitMqError
initialize

super initialize.
^ self amqpErrorCode: 0
	yourself
%
category: 'Initialize'
method: GsRabbitMqError
initializeFromChannelClosedMethod: aMethod

^ self amqpErrorCode: aMethod replyCode ;
	details: ('The broker has closed the channel. Reply code: ', aMethod replyCode asString, ' classId: ', aMethod classId asString, ' methodId: ', aMethod methodId asString, ' replyText: ', aMethod replyText asString)
	yourself
%
category: 'Initialize'
method: GsRabbitMqError
initializeFromConnectionClosedMethod: aMethod

^ self amqpErrorCode: aMethod replyCode ;
	details: ('The broker has closed the connection. Reply code: ', aMethod replyCode asString, ' classId: ', aMethod classId asString, ' methodId: ', aMethod methodId asString, ' replyText: ', aMethod replyText asString)
	yourself
%
category: 'Initialize'
method: GsRabbitMqError
initializeFromReply: aReply forOperation: aString

super initialize.
self replyType: aReply replyType.
aReply isLibraryException ifTrue:[ ^ self initializeLibraryExceptionFromReply: aReply forOperation: aString].
aReply isServerException ifTrue:[ ^ self initializeServerExceptionFromReply: aReply forOperation: aString].
aReply isSocketEof ifTrue:[ ^ self initializeSocketEofExceptionFromReply: aReply forOperation: aString].

"Should never reach this code!"
^self error: 'Unknown reply kind, should not be here!'
%
category: 'Initialize'
method: GsRabbitMqError
initializeLibraryExceptionFromReply: reply forOperation: aString

^ self amqpErrorCode: reply libraryErrorNotNoError ;
	details: (self buildErrorStringForOperation: aString with: ('with a library exception ', (reply connection library amqp_error_string2_: self amqpErrorCode))) ;
	yourself
%
category: 'Initialize'
method: GsRabbitMqError
initializeServerExceptionFromReply: reply forOperation: aString

^ self amqpErrorCode: reply methodNumber ;
	details: (self buildErrorStringForOperation: aString with: ('with a server exception. The server returned: ' , (reply connection library methodNumberToString: self amqpErrorCode))) ;
	yourself
%
category: 'Initialize'
method: GsRabbitMqError
initializeSocketEofExceptionFromReply: reply forOperation: aString

^ self amqpErrorCode: GsAmqpRpcReply AMQP_STATUS_SOCKET_CLOSED ;
	details: (self buildErrorStringForOperation: aString with: ('with socket EOF exception ', (reply connection library methodNumberToString: self amqpErrorCode))) ;
	yourself
%
category: 'Testing'
method: GsRabbitMqError
isLibraryException

^self replyType == GsAmqpRpcReply AMQP_RESPONSE_LIBRARY_EXCEPTION
%
category: 'Testing'
method: GsRabbitMqError
isServerException

^self replyType == GsAmqpRpcReply AMQP_RESPONSE_SERVER_EXCEPTION
%
category: 'Testing'
method: GsRabbitMqError
isSocketEof

^self replyType == GsAmqpRpcReply AMQP_RESPONSE_NONE
%
category: 'Accessing'
method: GsRabbitMqError
replyType
	^replyType
%
category: 'Updating'
method: GsRabbitMqError
replyType: newValue
	replyType := newValue
%
! ------------------- Remove existing behavior from GsAmqpChannelClose
removeAllMethods GsAmqpChannelClose
removeAllClassMethods GsAmqpChannelClose
! ------------------- Class methods for GsAmqpChannelClose
! ------------------- Instance methods for GsAmqpChannelClose
! ------------------- Remove existing behavior from GsLibRabbitMq
removeAllMethods GsLibRabbitMq
removeAllClassMethods GsLibRabbitMq
! ------------------- Class methods for GsLibRabbitMq
category: 'Constants'
classmethod: GsLibRabbitMq
AMQP_REPLY_SUCCESS

^ 200
%
category: 'Converting'
classmethod: GsLibRabbitMq
createStructTimeValForMilliseconds: ms
	"GsLibRabbitMq createStructTimeValForMilliseconds: 4444"
	"Create a struct timeVal from a millisecond value. In 64 bit Linux, struct time val is:

struct timeval
{
  __time_t tv_sec; // seconds, 8 bytes
  __suseconds_t tv_usec; // microseconds, 8 bytes
};

The result is a CByteArray containing 16 bytes in C space. Since it is created using gcMalloc:, the
space will be freed by the garbage collection when no longer in use.

Passing nil to the CCallout passes NULL to the C function which causes blocking behavior"

	^ms
		ifNil: [nil] "Caller wants infinite timeout (blocking)"
		ifNotNil:
			[| seconds microSeconds |
			ms _validateClass: SmallInteger .
			seconds := ms // 1000.
			microSeconds := 1000 * (ms \\ 1000).
			CByteArray fromArrayOfInt64:
					{seconds.
					microSeconds}]
%
category: 'Converting'
classmethod: GsLibRabbitMq
createTimeStructArrayForMs: ms
	"Answer an Array of 3 elements:

1) CByteArray representing timeStruct for the repeated short blocking operations or sleeps, or nil for inifinite wait.
2) SmallInteger representing the repeat count for item 1.
3) CByteArray representing timeStruct for the final short block or sleep, or 0 for no final block or sleep.
"

	^ms == nil
		ifTrue:
			["Caller wants blocking wait with infinite timeout. Implement as 250 waits with a very high repeat count"
			Array
				with: (self createStructTimeValForMilliseconds: self maxBlockMsTimeMs)
				with: SmallInteger maximumValue
				with: 0]
		ifFalse:
			[ms == 0
				ifTrue:
					[Array
						with: (self createStructTimeValForMilliseconds: 0)
						with: 1
						with: 0]
				ifFalse:
					[| mod div maxBlockMs result |
					maxBlockMs := self maxBlockTimeMs.
					div := ms // maxBlockMs.
					mod := ms \\ maxBlockMs.
					result := Array new: 3.
					result
						at: 1 put: (self createStructTimeValForMilliseconds: maxBlockMs);
						at: 2 put: div;
						at: 3
							put: (mod == 0
									ifTrue: [0]
									ifFalse: [self createStructTimeValForMilliseconds: mod]);
						yourself]]
%
category: 'Code Generation'
classmethod: GsLibRabbitMq
generateAllMethods

"GsLibRabbitMq generateAllMethods"

"Code generated from building this source tree:

normg@moop>git remote -v
origin	git@github.com:alanxz/rabbitmq-c.git (fetch)
origin	git@github.com:alanxz/rabbitmq-c.git (push)
/moop3/users/normg/rabbitmq
normg@moop>git branch
* master
"


	| hdr paths searchpath lib |
	paths :=
			{'rabbitmq-c/amqp.h'.
			'rabbitmq-c/tcp_socket.h'.
			'rabbitmq-c/ssl_socket.h'}.
	searchpath := '/moop3/users/normg/rabbitmq_inst/include'.
	lib := '/moop3/users/normg/rabbitmq_inst/lib/librabbitmq'.
	paths do:
			[:e |
			hdr := CHeader path: e searchPath: searchpath.
			hdr
				createFunctionsInClass: self
				libraryPathExpressionString: lib
				select: nil].
	^hdr
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunctions
	 | library |
	 library := CLibrary named: '/moop3/users/normg/rabbitmq_inst/lib/librabbitmq' .
   self initializeFunctions: library .
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunctions: aCLibrary
	self
	initializeFunction_amqp_basic_ack_inLibrary: aCLibrary ;
	initializeFunction_amqp_basic_cancel_inLibrary: aCLibrary ;
	initializeFunction_amqp_basic_consume_inLibrary: aCLibrary ;
	initializeFunction_amqp_basic_get_inLibrary: aCLibrary ;
	initializeFunction_amqp_basic_nack_inLibrary: aCLibrary ;
	initializeFunction_amqp_basic_publish_inLibrary: aCLibrary ;
	initializeFunction_amqp_basic_qos_inLibrary: aCLibrary ;
	initializeFunction_amqp_basic_recover_inLibrary: aCLibrary ;
	initializeFunction_amqp_basic_reject_inLibrary: aCLibrary ;
	initializeFunction_amqp_bytes_free_inLibrary: aCLibrary ;
	initializeFunction_amqp_bytes_malloc_inLibrary: aCLibrary ;
	initializeFunction_amqp_bytes_malloc_dup_inLibrary: aCLibrary ;
	initializeFunction_amqp_channel_close_inLibrary: aCLibrary ;
	initializeFunction_amqp_channel_flow_inLibrary: aCLibrary ;
	initializeFunction_amqp_channel_open_inLibrary: aCLibrary ;
	initializeFunction_amqp_confirm_select_inLibrary: aCLibrary ;
	initializeFunction_amqp_connection_close_inLibrary: aCLibrary ;
	initializeFunction_amqp_connection_update_secret_inLibrary: aCLibrary ;
	initializeFunction_amqp_constant_is_hard_error_inLibrary: aCLibrary ;
	initializeFunction_amqp_constant_name_inLibrary: aCLibrary ;
	initializeFunction_amqp_consume_message_inLibrary: aCLibrary ;
	initializeFunction_amqp_cstring_bytes_inLibrary: aCLibrary ;
	initializeFunction_amqp_data_in_buffer_inLibrary: aCLibrary ;
	initializeFunction_amqp_decode_method_inLibrary: aCLibrary ;
	initializeFunction_amqp_decode_properties_inLibrary: aCLibrary ;
	initializeFunction_amqp_decode_table_inLibrary: aCLibrary ;
	initializeFunction_amqp_default_connection_info_inLibrary: aCLibrary ;
	initializeFunction_amqp_destroy_connection_inLibrary: aCLibrary ;
	initializeFunction_amqp_destroy_envelope_inLibrary: aCLibrary ;
	initializeFunction_amqp_destroy_message_inLibrary: aCLibrary ;
	initializeFunction_amqp_encode_method_inLibrary: aCLibrary ;
	initializeFunction_amqp_encode_properties_inLibrary: aCLibrary ;
	initializeFunction_amqp_encode_table_inLibrary: aCLibrary ;
	initializeFunction_amqp_error_string_inLibrary: aCLibrary ;
	initializeFunction_amqp_error_string2_inLibrary: aCLibrary ;
	initializeFunction_amqp_exchange_bind_inLibrary: aCLibrary ;
	initializeFunction_amqp_exchange_declare_inLibrary: aCLibrary ;
	initializeFunction_amqp_exchange_delete_inLibrary: aCLibrary ;
	initializeFunction_amqp_exchange_unbind_inLibrary: aCLibrary ;
	initializeFunction_amqp_frames_enqueued_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_channel_max_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_client_properties_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_frame_max_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_handshake_timeout_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_heartbeat_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_rpc_reply_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_rpc_timeout_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_server_properties_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_socket_inLibrary: aCLibrary ;
	initializeFunction_amqp_get_sockfd_inLibrary: aCLibrary ;
	initializeFunction_amqp_handle_input_inLibrary: aCLibrary ;
	initializeFunction_amqp_initialize_ssl_library_inLibrary: aCLibrary ;
	initializeFunction_amqp_login_inLibrary: aCLibrary ;
	initializeFunction_amqp_login_with_properties_inLibrary: aCLibrary ;
	initializeFunction_amqp_maybe_release_buffers_inLibrary: aCLibrary ;
	initializeFunction_amqp_maybe_release_buffers_on_channel_inLibrary: aCLibrary ;
	initializeFunction_amqp_method_has_content_inLibrary: aCLibrary ;
	initializeFunction_amqp_method_name_inLibrary: aCLibrary ;
	initializeFunction_amqp_new_connection_inLibrary: aCLibrary ;
	initializeFunction_amqp_open_socket_inLibrary: aCLibrary ;
	initializeFunction_amqp_parse_url_inLibrary: aCLibrary ;
	initializeFunction_amqp_pool_alloc_inLibrary: aCLibrary ;
	initializeFunction_amqp_pool_alloc_bytes_inLibrary: aCLibrary ;
	initializeFunction_amqp_queue_bind_inLibrary: aCLibrary ;
	initializeFunction_amqp_queue_declare_inLibrary: aCLibrary ;
	initializeFunction_amqp_queue_delete_inLibrary: aCLibrary ;
	initializeFunction_amqp_queue_purge_inLibrary: aCLibrary ;
	initializeFunction_amqp_queue_unbind_inLibrary: aCLibrary ;
	initializeFunction_amqp_read_message_inLibrary: aCLibrary ;
	initializeFunction_amqp_release_buffers_inLibrary: aCLibrary ;
	initializeFunction_amqp_release_buffers_ok_inLibrary: aCLibrary ;
	initializeFunction_amqp_send_frame_inLibrary: aCLibrary ;
	initializeFunction_amqp_send_header_inLibrary: aCLibrary ;
	initializeFunction_amqp_send_method_inLibrary: aCLibrary ;
	initializeFunction_amqp_set_handshake_timeout_inLibrary: aCLibrary ;
	initializeFunction_amqp_set_initialize_ssl_library_inLibrary: aCLibrary ;
	initializeFunction_amqp_set_rpc_timeout_inLibrary: aCLibrary ;
	initializeFunction_amqp_set_sockfd_inLibrary: aCLibrary ;
	initializeFunction_amqp_set_ssl_engine_inLibrary: aCLibrary ;
	initializeFunction_amqp_simple_rpc_inLibrary: aCLibrary ;
	initializeFunction_amqp_simple_rpc_decoded_inLibrary: aCLibrary ;
	initializeFunction_amqp_simple_wait_frame_inLibrary: aCLibrary ;
	initializeFunction_amqp_simple_wait_frame_noblock_inLibrary: aCLibrary ;
	initializeFunction_amqp_simple_wait_method_inLibrary: aCLibrary ;
	initializeFunction_amqp_socket_get_sockfd_inLibrary: aCLibrary ;
	initializeFunction_amqp_socket_open_inLibrary: aCLibrary ;
	initializeFunction_amqp_socket_open_noblock_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_get_context_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_new_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_set_cacert_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_set_key_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_set_key_buffer_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_set_key_engine_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_set_key_passwd_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_set_ssl_versions_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_set_verify_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_set_verify_hostname_inLibrary: aCLibrary ;
	initializeFunction_amqp_ssl_socket_set_verify_peer_inLibrary: aCLibrary ;
	initializeFunction_amqp_table_clone_inLibrary: aCLibrary ;
	initializeFunction_amqp_table_entry_cmp_inLibrary: aCLibrary ;
	initializeFunction_amqp_tune_connection_inLibrary: aCLibrary ;
	initializeFunction_amqp_tx_commit_inLibrary: aCLibrary ;
	initializeFunction_amqp_tx_rollback_inLibrary: aCLibrary ;
	initializeFunction_amqp_tx_select_inLibrary: aCLibrary ;
	initializeFunction_amqp_uninitialize_ssl_library_inLibrary: aCLibrary ;
	initializeFunction_amqp_version_inLibrary: aCLibrary ;
	initializeFunction_amqp_version_number_inLibrary: aCLibrary ;
	initializeFunction_empty_amqp_pool_inLibrary: aCLibrary ;
	initializeFunction_init_amqp_pool_inLibrary: aCLibrary ;
	initializeFunction_recycle_amqp_pool_inLibrary: aCLibrary ;
	yourself.
%
category: 'Class Initialization'
classmethod: GsLibRabbitMq
initializeFunctionsFromLibraryPath

| library functionInitSelectors |
library := CLibrary named: self libraryPath .
functionInitSelectors := (self class selectors) select:[:e| 0 ~~ (e asString findPattern: (Array with: 'initializeFunction_') startingAt: 1)].
functionInitSelectors do:[:aSelector| self perform: aSelector with: library].
^ self
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_basic_ack_inLibrary: cLibrary

	Function_amqp_basic_ack := CCallout
		library: cLibrary
		name: 'amqp_basic_ack'
		result: #'int32'
		args: #( #'ptr' #'uint16' #'uint64' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_basic_cancel_inLibrary: cLibrary
  Function_amqp_basic_cancel := CCalloutStructs library: cLibrary name: 'amqp_basic_cancel'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"consumer_tag"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_basic_consume_inLibrary: cLibrary
  Function_amqp_basic_consume := CCalloutStructs library: cLibrary name: 'amqp_basic_consume'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"queue"  #'struct'"consumer_tag"  #'int32'"no_local"  #'int32'"no_ack"  #'int32'"exclusive"  #'struct'"arguments"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 16 nil nil nil 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_basic_get_inLibrary: cLibrary
  Function_amqp_basic_get := CCalloutStructs library: cLibrary name: 'amqp_basic_get'
  result:  #struct
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"queue"  #'int32'"no_ack"    )
	 varArgsAfter: -1
	 structSizes: #( 32 nil nil 16 nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_basic_nack_inLibrary: cLibrary

	Function_amqp_basic_nack := CCallout
		library: cLibrary
		name: 'amqp_basic_nack'
		result: #'int32'
		args: #( #'ptr' #'uint16' #'uint64' #'int32' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_basic_publish_inLibrary: cLibrary
  Function_amqp_basic_publish := CCalloutStructs library: cLibrary name: 'amqp_basic_publish'
  result: #'int32'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"exchange"  #'struct'"routing_key"  #'int32'"mandatory"  #'int32'"immediate"  #'ptr'"properties"  #'struct'"body"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 16 nil nil nil 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_basic_qos_inLibrary: cLibrary

	Function_amqp_basic_qos := CCallout
		library: cLibrary
		name: 'amqp_basic_qos'
		result: #'ptr'
		args: #( #'ptr' #'uint16' #'uint32' #'uint16' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_basic_recover_inLibrary: cLibrary

	Function_amqp_basic_recover := CCallout
		library: cLibrary
		name: 'amqp_basic_recover'
		result: #'ptr'
		args: #( #'ptr' #'uint16' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_basic_reject_inLibrary: cLibrary

	Function_amqp_basic_reject := CCallout
		library: cLibrary
		name: 'amqp_basic_reject'
		result: #'int32'
		args: #( #'ptr' #'uint16' #'uint64' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_bytes_free_inLibrary: cLibrary
  Function_amqp_bytes_free := CCalloutStructs library: cLibrary name: 'amqp_bytes_free'
  result: #'void'
  args: #(  #'struct'"bytes"    )
	 varArgsAfter: -1
	 structSizes: #( nil 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_bytes_malloc_dup_inLibrary: cLibrary
  Function_amqp_bytes_malloc_dup := CCalloutStructs library: cLibrary name: 'amqp_bytes_malloc_dup'
  result:  #struct
  args: #(  #'struct'"src"    )
	 varArgsAfter: -1
	 structSizes: #( 16 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_bytes_malloc_inLibrary: cLibrary
  Function_amqp_bytes_malloc := CCalloutStructs library: cLibrary name: 'amqp_bytes_malloc'
  result:  #struct
  args: #(  #'uint64'"amount"    )
	 varArgsAfter: -1
	 structSizes: #( 16 nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_channel_close_inLibrary: cLibrary
  Function_amqp_channel_close := CCalloutStructs library: cLibrary name: 'amqp_channel_close'
  result:  #struct
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'int32'"code"    )
	 varArgsAfter: -1
	 structSizes: #( 32 nil nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_channel_flow_inLibrary: cLibrary

	Function_amqp_channel_flow := CCallout
		library: cLibrary
		name: 'amqp_channel_flow'
		result: #'ptr'
		args: #( #'ptr' #'uint16' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_channel_open_inLibrary: cLibrary

	Function_amqp_channel_open := CCallout
		library: cLibrary
		name: 'amqp_channel_open'
		result: #'ptr'
		args: #( #'ptr' #'uint16').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_confirm_select_inLibrary: cLibrary

	Function_amqp_confirm_select := CCallout
		library: cLibrary
		name: 'amqp_confirm_select'
		result: #'ptr'
		args: #( #'ptr' #'uint16').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_connection_close_inLibrary: cLibrary
  Function_amqp_connection_close := CCalloutStructs library: cLibrary name: 'amqp_connection_close'
  result:  #struct
  args: #(  #'ptr'"state"  #'int32'"code"    )
	 varArgsAfter: -1
	 structSizes: #( 32 nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_connection_update_secret_inLibrary: cLibrary
  Function_amqp_connection_update_secret := CCalloutStructs library: cLibrary name: 'amqp_connection_update_secret'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"new_secret"  #'struct'"reason"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_constant_is_hard_error_inLibrary: cLibrary

	Function_amqp_constant_is_hard_error := CCallout
		library: cLibrary
		name: 'amqp_constant_is_hard_error'
		result: #'int32'
		args: #( #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_constant_name_inLibrary: cLibrary

	Function_amqp_constant_name := CCallout
		library: cLibrary
		name: 'amqp_constant_name'
		result: #'char*'
		args: #( #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_consume_message_inLibrary: cLibrary
  Function_amqp_consume_message := CCalloutStructs library: cLibrary name: 'amqp_consume_message'
  result:  #struct
  args: #(  #'ptr'"state"  #'ptr'"envelope"  #'ptr'"timeout"  #'int32'"flags"    )
	 varArgsAfter: -1
	 structSizes: #( 32 nil nil nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_cstring_bytes_inLibrary: cLibrary
  Function_amqp_cstring_bytes := CCalloutStructs library: cLibrary name: 'amqp_cstring_bytes'
  result:  #struct
  args: #(  #'const char*'"cstr"    )
	 varArgsAfter: -1
	 structSizes: #( 16 nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_data_in_buffer_inLibrary: cLibrary

	Function_amqp_data_in_buffer := CCallout
		library: cLibrary
		name: 'amqp_data_in_buffer'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_decode_method_inLibrary: cLibrary
  Function_amqp_decode_method := CCalloutStructs library: cLibrary name: 'amqp_decode_method'
  result: #'int32'
  args: #(  #'uint32'"methodNumber"  #'ptr'"pool"  #'struct'"encoded"  #'ptr'"decoded"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_decode_properties_inLibrary: cLibrary
  Function_amqp_decode_properties := CCalloutStructs library: cLibrary name: 'amqp_decode_properties'
  result: #'int32'
  args: #(  #'uint16'"class_id"  #'ptr'"pool"  #'struct'"encoded"  #'ptr'"decoded"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_decode_table_inLibrary: cLibrary
  Function_amqp_decode_table := CCalloutStructs library: cLibrary name: 'amqp_decode_table'
  result: #'int32'
  args: #(  #'struct'"encoded"  #'ptr'"pool"  #'ptr'"output"  #'ptr'"offset"    )
	 varArgsAfter: -1
	 structSizes: #( nil 16 nil nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_default_connection_info_inLibrary: cLibrary

	Function_amqp_default_connection_info := CCallout
		library: cLibrary
		name: 'amqp_default_connection_info'
		result: #'void'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_destroy_connection_inLibrary: cLibrary

	Function_amqp_destroy_connection := CCallout
		library: cLibrary
		name: 'amqp_destroy_connection'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_destroy_envelope_inLibrary: cLibrary

	Function_amqp_destroy_envelope := CCallout
		library: cLibrary
		name: 'amqp_destroy_envelope'
		result: #'void'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_destroy_message_inLibrary: cLibrary

	Function_amqp_destroy_message := CCallout
		library: cLibrary
		name: 'amqp_destroy_message'
		result: #'void'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_encode_method_inLibrary: cLibrary
  Function_amqp_encode_method := CCalloutStructs library: cLibrary name: 'amqp_encode_method'
  result: #'int32'
  args: #(  #'uint32'"methodNumber"  #'ptr'"decoded"  #'struct'"encoded"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_encode_properties_inLibrary: cLibrary
  Function_amqp_encode_properties := CCalloutStructs library: cLibrary name: 'amqp_encode_properties'
  result: #'int32'
  args: #(  #'uint16'"class_id"  #'ptr'"decoded"  #'struct'"encoded"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_encode_table_inLibrary: cLibrary
  Function_amqp_encode_table := CCalloutStructs library: cLibrary name: 'amqp_encode_table'
  result: #'int32'
  args: #(  #'struct'"encoded"  #'ptr'"input"  #'ptr'"offset"    )
	 varArgsAfter: -1
	 structSizes: #( nil 16 nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_error_string2_inLibrary: cLibrary

	Function_amqp_error_string2 := CCallout
		library: cLibrary
		name: 'amqp_error_string2'
		result: #'char*'
		args: #( #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_error_string_inLibrary: cLibrary

	Function_amqp_error_string := CCallout
		library: cLibrary
		name: 'amqp_error_string'
		result: #'char*'
		args: #( #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_exchange_bind_inLibrary: cLibrary
  Function_amqp_exchange_bind := CCalloutStructs library: cLibrary name: 'amqp_exchange_bind'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"destination"  #'struct'"source"  #'struct'"routing_key"  #'struct'"arguments"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 16 16 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_exchange_declare_inLibrary: cLibrary
  Function_amqp_exchange_declare := CCalloutStructs library: cLibrary name: 'amqp_exchange_declare'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"exchange"  #'struct'"type"  #'int32'"passive"  #'int32'"durable"  #'int32'"auto_delete"  #'int32'"internal"  #'struct'"arguments"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 16 nil nil nil nil 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_exchange_delete_inLibrary: cLibrary
  Function_amqp_exchange_delete := CCalloutStructs library: cLibrary name: 'amqp_exchange_delete'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"exchange"  #'int32'"if_unused"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_exchange_unbind_inLibrary: cLibrary
  Function_amqp_exchange_unbind := CCalloutStructs library: cLibrary name: 'amqp_exchange_unbind'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"destination"  #'struct'"source"  #'struct'"routing_key"  #'struct'"arguments"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 16 16 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_frames_enqueued_inLibrary: cLibrary

	Function_amqp_frames_enqueued := CCallout
		library: cLibrary
		name: 'amqp_frames_enqueued'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_channel_max_inLibrary: cLibrary

	Function_amqp_get_channel_max := CCallout
		library: cLibrary
		name: 'amqp_get_channel_max'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_client_properties_inLibrary: cLibrary

	Function_amqp_get_client_properties := CCallout
		library: cLibrary
		name: 'amqp_get_client_properties'
		result: #'ptr'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_frame_max_inLibrary: cLibrary

	Function_amqp_get_frame_max := CCallout
		library: cLibrary
		name: 'amqp_get_frame_max'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_handshake_timeout_inLibrary: cLibrary

	Function_amqp_get_handshake_timeout := CCallout
		library: cLibrary
		name: 'amqp_get_handshake_timeout'
		result: #'ptr'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_heartbeat_inLibrary: cLibrary

	Function_amqp_get_heartbeat := CCallout
		library: cLibrary
		name: 'amqp_get_heartbeat'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_rpc_reply_inLibrary: cLibrary
  Function_amqp_get_rpc_reply := CCalloutStructs library: cLibrary name: 'amqp_get_rpc_reply'
  result:  #struct
  args: #(  #'ptr'"state"    )
	 varArgsAfter: -1
	 structSizes: #( 32 nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_rpc_timeout_inLibrary: cLibrary

	Function_amqp_get_rpc_timeout := CCallout
		library: cLibrary
		name: 'amqp_get_rpc_timeout'
		result: #'ptr'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_server_properties_inLibrary: cLibrary

	Function_amqp_get_server_properties := CCallout
		library: cLibrary
		name: 'amqp_get_server_properties'
		result: #'ptr'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_socket_inLibrary: cLibrary

	Function_amqp_get_socket := CCallout
		library: cLibrary
		name: 'amqp_get_socket'
		result: #'ptr'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_get_sockfd_inLibrary: cLibrary

	Function_amqp_get_sockfd := CCallout
		library: cLibrary
		name: 'amqp_get_sockfd'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_handle_input_inLibrary: cLibrary
  Function_amqp_handle_input := CCalloutStructs library: cLibrary name: 'amqp_handle_input'
  result: #'int32'
  args: #(  #'ptr'"state"  #'struct'"received_data"  #'ptr'"decoded_frame"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil 16 nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_initialize_ssl_library_inLibrary: cLibrary

	Function_amqp_initialize_ssl_library := CCallout
		library: cLibrary
		name: 'amqp_initialize_ssl_library'
		result: #'int32'
		args: #().
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_login_inLibrary: cLibrary
  Function_amqp_login := CCalloutStructs library: cLibrary name: 'amqp_login'
  result:  #struct
  args: #(  #'ptr'"state"  #'const char*'"vhost"  #'int32'"channel_max"  #'int32'"frame_max"  #'int32'"heartbeat"  #'int32'"sasl_method"    )
	 varArgsAfter: 6
	 structSizes: #( 32 nil nil nil nil nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_login_with_properties_inLibrary: cLibrary
  Function_amqp_login_with_properties := CCalloutStructs library: cLibrary name: 'amqp_login_with_properties'
  result:  #struct
  args: #(  #'ptr'"state"  #'const char*'"vhost"  #'int32'"channel_max"  #'int32'"frame_max"  #'int32'"heartbeat"  #'ptr'"properties"  #'int32'"sasl_method"    )
	 varArgsAfter: 7
	 structSizes: #( 32 nil nil nil nil nil nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_maybe_release_buffers_inLibrary: cLibrary

	Function_amqp_maybe_release_buffers := CCallout
		library: cLibrary
		name: 'amqp_maybe_release_buffers'
		result: #'void'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_maybe_release_buffers_on_channel_inLibrary: cLibrary

	Function_amqp_maybe_release_buffers_on_channel := CCallout
		library: cLibrary
		name: 'amqp_maybe_release_buffers_on_channel'
		result: #'void'
		args: #( #'ptr' #'uint16').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_method_has_content_inLibrary: cLibrary

	Function_amqp_method_has_content := CCallout
		library: cLibrary
		name: 'amqp_method_has_content'
		result: #'int32'
		args: #( #'uint32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_method_name_inLibrary: cLibrary

	Function_amqp_method_name := CCallout
		library: cLibrary
		name: 'amqp_method_name'
		result: #'char*'
		args: #( #'uint32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_new_connection_inLibrary: cLibrary

	Function_amqp_new_connection := CCallout
		library: cLibrary
		name: 'amqp_new_connection'
		result: #'ptr'
		args: #().
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_open_socket_inLibrary: cLibrary

	Function_amqp_open_socket := CCallout
		library: cLibrary
		name: 'amqp_open_socket'
		result: #'int32'
		args: #( #'const char*' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_parse_url_inLibrary: cLibrary

	Function_amqp_parse_url := CCallout
		library: cLibrary
		name: 'amqp_parse_url'
		result: #'int32'
		args: #( #'ptr' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_pool_alloc_bytes_inLibrary: cLibrary

	Function_amqp_pool_alloc_bytes := CCallout
		library: cLibrary
		name: 'amqp_pool_alloc_bytes'
		result: #'void'
		args: #( #'ptr' #'uint64' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_pool_alloc_inLibrary: cLibrary

	Function_amqp_pool_alloc := CCallout
		library: cLibrary
		name: 'amqp_pool_alloc'
		result: #'ptr'
		args: #( #'ptr' #'uint64').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_queue_bind_inLibrary: cLibrary
  Function_amqp_queue_bind := CCalloutStructs library: cLibrary name: 'amqp_queue_bind'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"queue"  #'struct'"exchange"  #'struct'"routing_key"  #'struct'"arguments"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 16 16 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_queue_declare_inLibrary: cLibrary
  Function_amqp_queue_declare := CCalloutStructs library: cLibrary name: 'amqp_queue_declare'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"queue"  #'int32'"passive"  #'int32'"durable"  #'int32'"exclusive"  #'int32'"auto_delete"  #'struct'"arguments"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 nil nil nil nil 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_queue_delete_inLibrary: cLibrary
  Function_amqp_queue_delete := CCalloutStructs library: cLibrary name: 'amqp_queue_delete'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"queue"  #'int32'"if_unused"  #'int32'"if_empty"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_queue_purge_inLibrary: cLibrary
  Function_amqp_queue_purge := CCalloutStructs library: cLibrary name: 'amqp_queue_purge'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"queue"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_queue_unbind_inLibrary: cLibrary
  Function_amqp_queue_unbind := CCalloutStructs library: cLibrary name: 'amqp_queue_unbind'
  result: #'ptr'
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'struct'"queue"  #'struct'"exchange"  #'struct'"routing_key"  #'struct'"arguments"    )
	 varArgsAfter: -1
	 structSizes: #( nil nil nil 16 16 16 16  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_read_message_inLibrary: cLibrary
  Function_amqp_read_message := CCalloutStructs library: cLibrary name: 'amqp_read_message'
  result:  #struct
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'ptr'"message"  #'int32'"flags"    )
	 varArgsAfter: -1
	 structSizes: #( 32 nil nil nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_release_buffers_inLibrary: cLibrary

	Function_amqp_release_buffers := CCallout
		library: cLibrary
		name: 'amqp_release_buffers'
		result: #'void'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_release_buffers_ok_inLibrary: cLibrary

	Function_amqp_release_buffers_ok := CCallout
		library: cLibrary
		name: 'amqp_release_buffers_ok'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_send_frame_inLibrary: cLibrary

	Function_amqp_send_frame := CCallout
		library: cLibrary
		name: 'amqp_send_frame'
		result: #'int32'
		args: #( #'ptr' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_send_header_inLibrary: cLibrary

	Function_amqp_send_header := CCallout
		library: cLibrary
		name: 'amqp_send_header'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_send_method_inLibrary: cLibrary

	Function_amqp_send_method := CCallout
		library: cLibrary
		name: 'amqp_send_method'
		result: #'int32'
		args: #( #'ptr' #'uint16' #'uint32' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_set_handshake_timeout_inLibrary: cLibrary

	Function_amqp_set_handshake_timeout := CCallout
		library: cLibrary
		name: 'amqp_set_handshake_timeout'
		result: #'int32'
		args: #( #'ptr' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_set_initialize_ssl_library_inLibrary: cLibrary

	Function_amqp_set_initialize_ssl_library := CCallout
		library: cLibrary
		name: 'amqp_set_initialize_ssl_library'
		result: #'void'
		args: #( #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_set_rpc_timeout_inLibrary: cLibrary

	Function_amqp_set_rpc_timeout := CCallout
		library: cLibrary
		name: 'amqp_set_rpc_timeout'
		result: #'int32'
		args: #( #'ptr' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_set_sockfd_inLibrary: cLibrary

	Function_amqp_set_sockfd := CCallout
		library: cLibrary
		name: 'amqp_set_sockfd'
		result: #'void'
		args: #( #'ptr' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_set_ssl_engine_inLibrary: cLibrary

	Function_amqp_set_ssl_engine := CCallout
		library: cLibrary
		name: 'amqp_set_ssl_engine'
		result: #'int32'
		args: #( #'const char*').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_simple_rpc_decoded_inLibrary: cLibrary

	Function_amqp_simple_rpc_decoded := CCallout
		library: cLibrary
		name: 'amqp_simple_rpc_decoded'
		result: #'ptr'
		args: #( #'ptr' #'uint16' #'uint32' #'uint32' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_simple_rpc_inLibrary: cLibrary
  Function_amqp_simple_rpc := CCalloutStructs library: cLibrary name: 'amqp_simple_rpc'
  result:  #struct
  args: #(  #'ptr'"state"  #'uint16'"channel"  #'uint32'"request_id"  #'ptr'"expected_reply_ids"  #'ptr'"decoded_request_method"    )
	 varArgsAfter: -1
	 structSizes: #( 32 nil nil nil nil nil  ).
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_simple_wait_frame_inLibrary: cLibrary

	Function_amqp_simple_wait_frame := CCallout
		library: cLibrary
		name: 'amqp_simple_wait_frame'
		result: #'int32'
		args: #( #'ptr' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_simple_wait_frame_noblock_inLibrary: cLibrary

	Function_amqp_simple_wait_frame_noblock := CCallout
		library: cLibrary
		name: 'amqp_simple_wait_frame_noblock'
		result: #'int32'
		args: #( #'ptr' #'ptr' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_simple_wait_method_inLibrary: cLibrary

	Function_amqp_simple_wait_method := CCallout
		library: cLibrary
		name: 'amqp_simple_wait_method'
		result: #'int32'
		args: #( #'ptr' #'uint16' #'uint32' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_socket_get_sockfd_inLibrary: cLibrary

	Function_amqp_socket_get_sockfd := CCallout
		library: cLibrary
		name: 'amqp_socket_get_sockfd'
		result: #'int32'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_socket_open_inLibrary: cLibrary

	Function_amqp_socket_open := CCallout
		library: cLibrary
		name: 'amqp_socket_open'
		result: #'int32'
		args: #( #'ptr' #'const char*' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_socket_open_noblock_inLibrary: cLibrary

	Function_amqp_socket_open_noblock := CCallout
		library: cLibrary
		name: 'amqp_socket_open_noblock'
		result: #'int32'
		args: #( #'ptr' #'const char*' #'int32' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_get_context_inLibrary: cLibrary

	Function_amqp_ssl_socket_get_context := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_get_context'
		result: #'ptr'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_new_inLibrary: cLibrary

	Function_amqp_ssl_socket_new := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_new'
		result: #'ptr'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_set_cacert_inLibrary: cLibrary

	Function_amqp_ssl_socket_set_cacert := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_set_cacert'
		result: #'int32'
		args: #( #'ptr' #'const char*').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_set_key_buffer_inLibrary: cLibrary

	Function_amqp_ssl_socket_set_key_buffer := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_set_key_buffer'
		result: #'int32'
		args: #( #'ptr' #'const char*' #'ptr' #'uint64').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_set_key_engine_inLibrary: cLibrary

	Function_amqp_ssl_socket_set_key_engine := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_set_key_engine'
		result: #'int32'
		args: #( #'ptr' #'const char*' #'const char*').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_set_key_inLibrary: cLibrary

	Function_amqp_ssl_socket_set_key := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_set_key'
		result: #'int32'
		args: #( #'ptr' #'const char*' #'const char*').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_set_key_passwd_inLibrary: cLibrary

	Function_amqp_ssl_socket_set_key_passwd := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_set_key_passwd'
		result: #'void'
		args: #( #'ptr' #'const char*').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_set_ssl_versions_inLibrary: cLibrary

	Function_amqp_ssl_socket_set_ssl_versions := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_set_ssl_versions'
		result: #'int32'
		args: #( #'ptr' #'int32' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_set_verify_hostname_inLibrary: cLibrary

	Function_amqp_ssl_socket_set_verify_hostname := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_set_verify_hostname'
		result: #'void'
		args: #( #'ptr' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_set_verify_inLibrary: cLibrary

	Function_amqp_ssl_socket_set_verify := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_set_verify'
		result: #'void'
		args: #( #'ptr' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_ssl_socket_set_verify_peer_inLibrary: cLibrary

	Function_amqp_ssl_socket_set_verify_peer := CCallout
		library: cLibrary
		name: 'amqp_ssl_socket_set_verify_peer'
		result: #'void'
		args: #( #'ptr' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_table_clone_inLibrary: cLibrary

	Function_amqp_table_clone := CCallout
		library: cLibrary
		name: 'amqp_table_clone'
		result: #'int32'
		args: #( #'ptr' #'ptr' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_table_entry_cmp_inLibrary: cLibrary

	Function_amqp_table_entry_cmp := CCallout
		library: cLibrary
		name: 'amqp_table_entry_cmp'
		result: #'int32'
		args: #( #'ptr' #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_tcp_socket_new_inLibrary: cLibrary

	Function_amqp_tcp_socket_new := CCallout
		library: cLibrary
		name: 'amqp_tcp_socket_new'
		result: #'ptr'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_tcp_socket_set_sockfd_inLibrary: cLibrary

	Function_amqp_tcp_socket_set_sockfd := CCallout
		library: cLibrary
		name: 'amqp_tcp_socket_set_sockfd'
		result: #'void'
		args: #( #'ptr' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_tune_connection_inLibrary: cLibrary

	Function_amqp_tune_connection := CCallout
		library: cLibrary
		name: 'amqp_tune_connection'
		result: #'int32'
		args: #( #'ptr' #'int32' #'int32' #'int32').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_tx_commit_inLibrary: cLibrary

	Function_amqp_tx_commit := CCallout
		library: cLibrary
		name: 'amqp_tx_commit'
		result: #'ptr'
		args: #( #'ptr' #'uint16').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_tx_rollback_inLibrary: cLibrary

	Function_amqp_tx_rollback := CCallout
		library: cLibrary
		name: 'amqp_tx_rollback'
		result: #'ptr'
		args: #( #'ptr' #'uint16').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_tx_select_inLibrary: cLibrary

	Function_amqp_tx_select := CCallout
		library: cLibrary
		name: 'amqp_tx_select'
		result: #'ptr'
		args: #( #'ptr' #'uint16').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_uninitialize_ssl_library_inLibrary: cLibrary

	Function_amqp_uninitialize_ssl_library := CCallout
		library: cLibrary
		name: 'amqp_uninitialize_ssl_library'
		result: #'int32'
		args: #().
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_version_inLibrary: cLibrary

	Function_amqp_version := CCallout
		library: cLibrary
		name: 'amqp_version'
		result: #'char*'
		args: #().
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_amqp_version_number_inLibrary: cLibrary

	Function_amqp_version_number := CCallout
		library: cLibrary
		name: 'amqp_version_number'
		result: #'uint32'
		args: #().
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_empty_amqp_pool_inLibrary: cLibrary

	Function_empty_amqp_pool := CCallout
		library: cLibrary
		name: 'empty_amqp_pool'
		result: #'void'
		args: #( #'ptr').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_init_amqp_pool_inLibrary: cLibrary

	Function_init_amqp_pool := CCallout
		library: cLibrary
		name: 'init_amqp_pool'
		result: #'void'
		args: #( #'ptr' #'uint64').
%
category: 'Initializing - private'
classmethod: GsLibRabbitMq
initializeFunction_recycle_amqp_pool_inLibrary: cLibrary

	Function_recycle_amqp_pool := CCallout
		library: cLibrary
		name: 'recycle_amqp_pool'
		result: #'void'
		args: #( #'ptr').
%
category: 'Accessing'
classmethod: GsLibRabbitMq
libraryPath

"GsLibRabbitMq libraryPath"
^ libraryPath
%
category: 'Class Initialization'
classmethod: GsLibRabbitMq
libraryPath: aString

	self libraryPath = aString
		ifFalse:
			[libraryPath := aString.
			self initializeFunctionsFromLibraryPath].
	^self
%
category: 'Constants'
classmethod: GsLibRabbitMq
maxBlockTimeMs

^ 250
%
category: 'Instance Creation'
classmethod: GsLibRabbitMq
new

self libraryPath ifNil:[ ^ GsRabbitMqError signal: 'Path to librabbitmq library has not been set' ].
^ super new initialize
%
category: 'Instance Creation'
classmethod: GsLibRabbitMq
newWithLibraryPath: aLibraryPath

self libraryPath: aLibraryPath .
^ self new
%
! ------------------- Instance methods for GsLibRabbitMq
category: 'Functions'
method: GsLibRabbitMq
amqp_basic_ack_: state _: channel _: delivery_tag _: multiple
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1864
__attribute__((visibility(""default"")))int amqp_basic_ack(amqp_connection_state_t state,                             amqp_channel_t channel, uint64_t delivery_tag,                             amqp_boolean_t multiple);"
	"Interpreted as #int32 from #( #'ptr' #'uint16' #'uint64' #'int32' )"
	^ Function_amqp_basic_ack callWith: { state. channel. delivery_tag. multiple  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_basic_cancel_: state _: channel _: consumer_tag"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1091
__attribute__((visibility(""default"")))amqp_basic_cancel_ok_t *    amqp_basic_cancel(amqp_connection_state_t state, amqp_channel_t channel,                      amqp_bytes_t consumer_tag);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' )"
	| res args |
	  args := {  state . channel . consumer_tag  } .
	res := Function_amqp_basic_cancel callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_basic_consume_: state _: channel _: queue"struct16bytes" _: consumer_tag"struct16bytes" _: no_local _: no_ack _: exclusive _: arguments"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1078
__attribute__((visibility(""default"")))amqp_basic_consume_ok_t * amqp_basic_consume(    amqp_connection_state_t state, amqp_channel_t channel, amqp_bytes_t queue,    amqp_bytes_t consumer_tag, amqp_boolean_t no_local, amqp_boolean_t no_ack,    amqp_boolean_t exclusive, amqp_table_t arguments);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'struct' #'int32' #'int32' #'int32' #'struct' )"
	| res args |
	  args := {  state . channel . queue . consumer_tag . no_local . no_ack . exclusive . arguments  } .
	res := Function_amqp_basic_consume callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_basic_get_: result"struct32bytes" _: state _: channel _: queue"struct16bytes" _: no_ack

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1885
__attribute__((visibility(""default"")))amqp_rpc_reply_t amqp_basic_get(amqp_connection_state_t state,                                          amqp_channel_t channel,                                          amqp_bytes_t queue,                                          amqp_boolean_t no_ack);"
	"Interpreted as #struct from #( #'ptr' #'uint16' #'struct' #'int32' )"
	| res args |
	 res := result"resultStruct".
  args := {  state . channel . queue . no_ack  } .
	Function_amqp_basic_get callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_basic_nack_: state _: channel _: delivery_tag _: multiple _: requeue
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1931
__attribute__((visibility(""default"")))int amqp_basic_nack(amqp_connection_state_t state,                              amqp_channel_t channel, uint64_t delivery_tag,                              amqp_boolean_t multiple, amqp_boolean_t requeue);"
	"Interpreted as #int32 from #( #'ptr' #'uint16' #'uint64' #'int32' #'int32' )"
	^ Function_amqp_basic_nack callWith: { state. channel. delivery_tag. multiple. requeue  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_basic_publish_: state _: channel _: exchange"struct16bytes" _: routing_key"struct16bytes" _: mandatory _: immediate _: properties _: body"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1808
__attribute__((visibility(""default"")))int amqp_basic_publish(    amqp_connection_state_t state, amqp_channel_t channel,    amqp_bytes_t exchange, amqp_bytes_t routing_key, amqp_boolean_t mandatory,    amqp_boolean_t immediate, struct amqp_basic_properties_t_ const *properties,    amqp_bytes_t body);"
	"Interpreted as #int32 from #( #'ptr' #'uint16' #'struct' #'struct' #'int32' #'int32' #'ptr' #'struct' )"
	| res args |
	  args := {  state . channel . exchange . routing_key . mandatory . immediate . properties . body  } .
	res := Function_amqp_basic_publish callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_basic_qos_: state _: channel _: prefetch_size _: prefetch_count _: global
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1059
__attribute__((visibility(""default"")))amqp_basic_qos_ok_t * amqp_basic_qos(amqp_connection_state_t state,                                              amqp_channel_t channel,                                              uint32_t prefetch_size,                                              uint16_t prefetch_count,                                              amqp_boolean_t global);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'uint32' #'uint16' #'int32' )"
	^ Function_amqp_basic_qos callWith: { state. channel. prefetch_size. prefetch_count. global  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_basic_recover_: state _: channel _: requeue
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1103
__attribute__((visibility(""default"")))amqp_basic_recover_ok_t *    amqp_basic_recover(amqp_connection_state_t state, amqp_channel_t channel,                       amqp_boolean_t requeue);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'int32' )"
	^ Function_amqp_basic_recover callWith: { state. channel. requeue  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_basic_reject_: state _: channel _: delivery_tag _: requeue
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1907
__attribute__((visibility(""default"")))int amqp_basic_reject(amqp_connection_state_t state,                                amqp_channel_t channel, uint64_t delivery_tag,                                amqp_boolean_t requeue);"
	"Interpreted as #int32 from #( #'ptr' #'uint16' #'uint64' #'int32' )"
	^ Function_amqp_basic_reject callWith: { state. channel. delivery_tag. requeue  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_bytes_free_: bytes"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 922
__attribute__((visibility(""default"")))void amqp_bytes_free(amqp_bytes_t bytes);"
	"Interpreted as #void from #( #'struct' )"
	| res args |
	  args := {  bytes  } .
	res := Function_amqp_bytes_free callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_bytes_malloc_: result"struct16bytes" _: amount

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 905
__attribute__((visibility(""default"")))amqp_bytes_t amqp_bytes_malloc(size_t amount);"
	"Interpreted as #struct from #( #'uint64' )"
	| res args |
	 res := result"resultStruct".
  args := {  amount  } .
	Function_amqp_bytes_malloc callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_bytes_malloc_dup_: result"struct16bytes" _: src"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 888
__attribute__((visibility(""default"")))amqp_bytes_t amqp_bytes_malloc_dup(amqp_bytes_t src);"
	"Interpreted as #struct from #( #'struct' )"
	| res args |
	 res := result"resultStruct".
  args := {  src  } .
	Function_amqp_bytes_malloc_dup callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_channel_close_: result"struct32bytes" _: state _: channel _: code

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1826
__attribute__((visibility(""default"")))amqp_rpc_reply_t amqp_channel_close(amqp_connection_state_t state,                                              amqp_channel_t channel, int code);"
	"Interpreted as #struct from #( #'ptr' #'uint16' #'int32' )"
	| res args |
	 res := result"resultStruct".
  args := {  state . channel . code  } .
	Function_amqp_channel_close callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_channel_flow_: state _: channel _: active
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 906
__attribute__((visibility(""default"")))amqp_channel_flow_ok_t *    amqp_channel_flow(amqp_connection_state_t state, amqp_channel_t channel,                      amqp_boolean_t active);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'int32' )"
	^ Function_amqp_channel_flow callWith: { state. channel. active  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_channel_open_: state _: channel
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 895
__attribute__((visibility(""default"")))amqp_channel_open_ok_t *    amqp_channel_open(amqp_connection_state_t state, amqp_channel_t channel);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' )"
	^ Function_amqp_channel_open callWith: { state. channel  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_confirm_select_: state _: channel
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1144
__attribute__((visibility(""default"")))amqp_confirm_select_ok_t *    amqp_confirm_select(amqp_connection_state_t state, amqp_channel_t channel);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' )"
	^ Function_amqp_confirm_select callWith: { state. channel  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_connection_close_: result"struct32bytes" _: state _: code

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1844
__attribute__((visibility(""default"")))amqp_rpc_reply_t amqp_connection_close(amqp_connection_state_t state,                                                 int code);"
	"Interpreted as #struct from #( #'ptr' #'int32' )"
	| res args |
	 res := result"resultStruct".
  args := {  state . code  } .
	Function_amqp_connection_close callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_connection_update_secret_: state _: channel _: new_secret"struct16bytes" _: reason"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 884
__attribute__((visibility(""default"")))amqp_connection_update_secret_ok_t * amqp_connection_update_secret(    amqp_connection_state_t state, amqp_channel_t channel,    amqp_bytes_t new_secret, amqp_bytes_t reason);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'struct' )"
	| res args |
	  args := {  state . channel . new_secret . reason  } .
	res := Function_amqp_connection_update_secret callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_constant_is_hard_error_: constantNumber
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 67
__attribute__((visibility(""default"")))amqp_boolean_t amqp_constant_is_hard_error(int constantNumber);"
	"Interpreted as #int32 from #( #'int32' )"
	^ Function_amqp_constant_is_hard_error callWith: { constantNumber  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_constant_name_: constantNumber
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 55
__attribute__((visibility(""default"")))char const * amqp_constant_name(int constantNumber);"
	"Interpreted as #char* from #( #'int32' )"
	^ Function_amqp_constant_name callWith: { constantNumber  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_consume_message_: result"struct32bytes" _: state _: envelope _: timeout _: flags

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2144
__attribute__((visibility(""default"")))amqp_rpc_reply_t amqp_consume_message(amqp_connection_state_t state,                                                amqp_envelope_t *envelope,                                                const struct timeval *timeout,                                                int flags);"
	"Interpreted as #struct from #( #'ptr' #'ptr' #'ptr' #'int32' )"
	| res args |
	 res := result"resultStruct".
  args := {  state . envelope . timeout . flags  } .
	Function_amqp_consume_message callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_cstring_bytes_: result"struct16bytes" _: cstr

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 869
__attribute__((visibility(""default"")))amqp_bytes_t amqp_cstring_bytes(char const *cstr);"
	"Interpreted as #struct from #( #'const char*' )"
	| res args |
	 res := result"resultStruct".
  args := {  cstr  } .
	Function_amqp_cstring_bytes callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_data_in_buffer_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1947
__attribute__((visibility(""default"")))amqp_boolean_t amqp_data_in_buffer(amqp_connection_state_t state);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_data_in_buffer callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_decode_method_: methodNumber _: pool _: encoded"struct16bytes" _: decoded

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 102
__attribute__((visibility(""default"")))int amqp_decode_method(amqp_method_number_t methodNumber,                                 amqp_pool_t *pool, amqp_bytes_t encoded,                                 void **decoded);"
	"Interpreted as #int32 from #( #'uint32' #'ptr' #'struct' #'ptr' )"
	| res args |
	  args := {  methodNumber . pool . encoded . decoded  } .
	res := Function_amqp_decode_method callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_decode_properties_: class_id _: pool _: encoded"struct16bytes" _: decoded

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 116
__attribute__((visibility(""default"")))int amqp_decode_properties(uint16_t class_id, amqp_pool_t *pool,                                     amqp_bytes_t encoded, void **decoded);"
	"Interpreted as #int32 from #( #'uint16' #'ptr' #'struct' #'ptr' )"
	| res args |
	  args := {  class_id . pool . encoded . decoded  } .
	res := Function_amqp_decode_properties callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_decode_table_: encoded"struct16bytes" _: pool _: output _: offset

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2001
__attribute__((visibility(""default"")))int amqp_decode_table(amqp_bytes_t encoded, amqp_pool_t *pool,                                amqp_table_t *output, size_t *offset);"
	"Interpreted as #int32 from #( #'struct' #'ptr' #'ptr' #'ptr' )"
	| res args |
	  args := {  encoded . pool . output . offset  } .
	res := Function_amqp_decode_table callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_default_connection_info_: parsed
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2193
__attribute__((visibility(""default"")))void    amqp_default_connection_info(struct amqp_connection_info *parsed);"
	"Interpreted as #void from #( #'ptr' )"
	^ Function_amqp_default_connection_info callWith: { parsed  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_destroy_connection_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1076
__attribute__((visibility(""default"")))int amqp_destroy_connection(amqp_connection_state_t state);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_destroy_connection callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_destroy_envelope_: envelope
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2158
__attribute__((visibility(""default"")))void amqp_destroy_envelope(amqp_envelope_t *envelope);"
	"Interpreted as #void from #( #'ptr' )"
	^ Function_amqp_destroy_envelope callWith: { envelope  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_destroy_message_: message
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2093
__attribute__((visibility(""default"")))void amqp_destroy_message(amqp_message_t *message);"
	"Interpreted as #void from #( #'ptr' )"
	^ Function_amqp_destroy_message callWith: { message  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_encode_method_: methodNumber _: decoded _: encoded"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 130
__attribute__((visibility(""default"")))int amqp_encode_method(amqp_method_number_t methodNumber,                                 void *decoded, amqp_bytes_t encoded);"
	"Interpreted as #int32 from #( #'uint32' #'ptr' #'struct' )"
	| res args |
	  args := {  methodNumber . decoded . encoded  } .
	res := Function_amqp_encode_method callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_encode_properties_: class_id _: decoded _: encoded"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 144
__attribute__((visibility(""default"")))int amqp_encode_properties(uint16_t class_id, void *decoded,                                     amqp_bytes_t encoded);"
	"Interpreted as #int32 from #( #'uint16' #'ptr' #'struct' )"
	| res args |
	  args := {  class_id . decoded . encoded  } .
	res := Function_amqp_encode_properties callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_encode_table_: encoded"struct16bytes" _: input _: offset

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2024
__attribute__((visibility(""default"")))int amqp_encode_table(amqp_bytes_t encoded, amqp_table_t *input,                                size_t *offset);"
	"Interpreted as #int32 from #( #'struct' #'ptr' #'ptr' )"
	| res args |
	  args := {  encoded . input . offset  } .
	res := Function_amqp_encode_table callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_error_string2_: err
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1978
__attribute__((visibility(""default"")))const char * amqp_error_string2(int err);"
	"Interpreted as #char* from #( #'int32' )"
	^ Function_amqp_error_string2 callWith: { err  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_error_string_: err
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1965
__attribute__((visibility(""default""))) __attribute__ ((__deprecated__)) char * amqp_error_string(int err);"
	"Interpreted as #char* from #( #'int32' )"
	^ Function_amqp_error_string callWith: { err  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_exchange_bind_: state _: channel _: destination"struct16bytes" _: source"struct16bytes" _: routing_key"struct16bytes" _: arguments"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 954
__attribute__((visibility(""default"")))amqp_exchange_bind_ok_t *    amqp_exchange_bind(amqp_connection_state_t state, amqp_channel_t channel,                       amqp_bytes_t destination, amqp_bytes_t source,                       amqp_bytes_t routing_key, amqp_table_t arguments);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'struct' #'struct' #'struct' )"
	| res args |
	  args := {  state . channel . destination . source . routing_key . arguments  } .
	res := Function_amqp_exchange_bind callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_exchange_declare_: state _: channel _: exchange"struct16bytes" _: type"struct16bytes" _: passive _: durable _: auto_delete _: internal _: arguments"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 924
__attribute__((visibility(""default"")))amqp_exchange_declare_ok_t * amqp_exchange_declare(    amqp_connection_state_t state, amqp_channel_t channel,    amqp_bytes_t exchange, amqp_bytes_t type, amqp_boolean_t passive,    amqp_boolean_t durable, amqp_boolean_t auto_delete, amqp_boolean_t internal,    amqp_table_t arguments);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'struct' #'int32' #'int32' #'int32' #'int32' #'struct' )"
	| res args |
	  args := {  state . channel . exchange . type . passive . durable . auto_delete . internal . arguments  } .
	res := Function_amqp_exchange_declare callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_exchange_delete_: state _: channel _: exchange"struct16bytes" _: if_unused

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 939
__attribute__((visibility(""default"")))amqp_exchange_delete_ok_t *    amqp_exchange_delete(amqp_connection_state_t state, amqp_channel_t channel,                         amqp_bytes_t exchange, amqp_boolean_t if_unused);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'int32' )"
	| res args |
	  args := {  state . channel . exchange . if_unused  } .
	res := Function_amqp_exchange_delete callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_exchange_unbind_: state _: channel _: destination"struct16bytes" _: source"struct16bytes" _: routing_key"struct16bytes" _: arguments"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 970
__attribute__((visibility(""default"")))amqp_exchange_unbind_ok_t *    amqp_exchange_unbind(amqp_connection_state_t state, amqp_channel_t channel,                         amqp_bytes_t destination, amqp_bytes_t source,                         amqp_bytes_t routing_key, amqp_table_t arguments);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'struct' #'struct' #'struct' )"
	| res args |
	  args := {  state . channel . destination . source . routing_key . arguments  } .
	res := Function_amqp_exchange_unbind callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_frames_enqueued_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1327
__attribute__((visibility(""default"")))amqp_boolean_t amqp_frames_enqueued(amqp_connection_state_t state);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_frames_enqueued callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_channel_max_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1028
__attribute__((visibility(""default"")))int amqp_get_channel_max(amqp_connection_state_t state);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_get_channel_max callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_client_properties_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2323
__attribute__((visibility(""default"")))amqp_table_t *    amqp_get_client_properties(amqp_connection_state_t state);"
	"Interpreted as #ptr from #( #'ptr' )"
	^ Function_amqp_get_client_properties callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_frame_max_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1042
__attribute__((visibility(""default"")))int amqp_get_frame_max(amqp_connection_state_t state);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_get_frame_max callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_handshake_timeout_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2346
__attribute__((visibility(""default"")))struct timeval *    amqp_get_handshake_timeout(amqp_connection_state_t state);"
	"Interpreted as #ptr from #( #'ptr' )"
	^ Function_amqp_get_handshake_timeout callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_heartbeat_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1056
__attribute__((visibility(""default"")))int amqp_get_heartbeat(amqp_connection_state_t state);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_get_heartbeat callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_rpc_reply_: result"struct32bytes" _: state

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1629
__attribute__((visibility(""default"")))amqp_rpc_reply_t amqp_get_rpc_reply(amqp_connection_state_t state);"
	"Interpreted as #struct from #( #'ptr' )"
	| res args |
	 res := result"resultStruct".
  args := {  state  } .
	Function_amqp_get_rpc_reply callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_rpc_timeout_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2402
__attribute__((visibility(""default"")))struct timeval * amqp_get_rpc_timeout(amqp_connection_state_t state);"
	"Interpreted as #ptr from #( #'ptr' )"
	^ Function_amqp_get_rpc_timeout callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_server_properties_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2307
__attribute__((visibility(""default"")))amqp_table_t *    amqp_get_server_properties(amqp_connection_state_t state);"
	"Interpreted as #ptr from #( #'ptr' )"
	^ Function_amqp_get_server_properties callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_socket_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2294
__attribute__((visibility(""default"")))amqp_socket_t * amqp_get_socket(amqp_connection_state_t state);"
	"Interpreted as #ptr from #( #'ptr' )"
	^ Function_amqp_get_socket callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_get_sockfd_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 957
__attribute__((visibility(""default"")))int amqp_get_sockfd(amqp_connection_state_t state);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_get_sockfd callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_handle_input_: state _: received_data"struct16bytes" _: decoded_frame

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1121
__attribute__((visibility(""default"")))int amqp_handle_input(amqp_connection_state_t state,                                amqp_bytes_t received_data,                                amqp_frame_t *decoded_frame);"
	"Interpreted as #int32 from #( #'ptr' #'struct' #'ptr' )"
	| res args |
	  args := {  state . received_data . decoded_frame  } .
	res := Function_amqp_handle_input callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_initialize_ssl_library
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socketh line 247
__attribute__((visibility(""default"")))int amqp_initialize_ssl_library(void);"
	"Interpreted as #int32 from #( )"
	^ Function_amqp_initialize_ssl_library callWith: {  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_login_: result"struct32bytes" _: state _: vhost _: channel_max _: frame_max _: heartbeat _: sasl_method
	 varArgs: vaArray "pairs of type, arg"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1689
__attribute__((visibility(""default"")))amqp_rpc_reply_t amqp_login(amqp_connection_state_t state,                                      char const *vhost, int channel_max,                                      int frame_max, int heartbeat,                                      amqp_sasl_method_enum sasl_method, ...);"
	"Interpreted as #struct from #( #'ptr' #'const char*' #'int32' #'int32' #'int32' #'int32'  ...varArgs  )"
	| res args |
	 res := result"resultStruct".
  args := {  state . vhost . channel_max . frame_max . heartbeat . sasl_method  } .
	vaArray ifNotNil:[ args addAll: vaArray ].
	Function_amqp_login callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_login_with_properties_: result"struct32bytes" _: state _: vhost _: channel_max _: frame_max _: heartbeat _: properties _: sasl_method
	 varArgs: vaArray "pairs of type, arg"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1755
__attribute__((visibility(""default"")))amqp_rpc_reply_t amqp_login_with_properties(    amqp_connection_state_t state, char const *vhost, int channel_max,    int frame_max, int heartbeat, const amqp_table_t *properties,    amqp_sasl_method_enum sasl_method, ...);"
	"Interpreted as #struct from #( #'ptr' #'const char*' #'int32' #'int32' #'int32' #'ptr' #'int32'  ...varArgs  )"
	| res args |
	 res := result"resultStruct".
  args := {  state . vhost . channel_max . frame_max . heartbeat . properties . sasl_method  } .
	vaArray ifNotNil:[ args addAll: vaArray ].
	Function_amqp_login_with_properties callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_maybe_release_buffers_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1190
__attribute__((visibility(""default"")))void amqp_maybe_release_buffers(amqp_connection_state_t state);"
	"Interpreted as #void from #( #'ptr' )"
	^ Function_amqp_maybe_release_buffers callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_maybe_release_buffers_on_channel_: state _: channel
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1213
__attribute__((visibility(""default"")))void amqp_maybe_release_buffers_on_channel(    amqp_connection_state_t state, amqp_channel_t channel);"
	"Interpreted as #void from #( #'ptr' #'uint16' )"
	^ Function_amqp_maybe_release_buffers_on_channel callWith: { state. channel  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_method_has_content_: methodNumber
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 89
__attribute__((visibility(""default"")))amqp_boolean_t    amqp_method_has_content(amqp_method_number_t methodNumber);"
	"Interpreted as #int32 from #( #'uint32' )"
	^ Function_amqp_method_has_content callWith: { methodNumber  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_method_name_: methodNumber
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 77
__attribute__((visibility(""default"")))char const * amqp_method_name(amqp_method_number_t methodNumber);"
	"Interpreted as #char* from #( #'uint32' )"
	^ Function_amqp_method_name callWith: { methodNumber  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_new_connection
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqph line 937
__attribute__((visibility(""default"")))amqp_connection_state_t amqp_new_connection(void);"
	"Interpreted as #ptr from #( )"
	^ Function_amqp_new_connection callWith: {  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_open_socket_: hostname _: portnumber
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1284
__attribute__((visibility(""default"")))int amqp_open_socket(char const *hostname, int portnumber);"
	"Interpreted as #int32 from #( #'const char*' #'int32' )"
	^ Function_amqp_open_socket callWith: { hostname. portnumber  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_parse_url_: url _: parsed
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2223
__attribute__((visibility(""default"")))int amqp_parse_url(char *url, struct amqp_connection_info *parsed);"
	"Interpreted as #int32 from #( #'ptr' #'ptr' )"
	^ Function_amqp_parse_url callWith: { url. parsed  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_pool_alloc_: pool _: amount
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 825
__attribute__((visibility(""default"")))void * amqp_pool_alloc(amqp_pool_t *pool, size_t amount);"
	"Interpreted as #ptr from #( #'ptr' #'uint64' )"
	^ Function_amqp_pool_alloc callWith: { pool. amount  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_pool_alloc_bytes_: pool _: amount _: output
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 847
__attribute__((visibility(""default"")))void amqp_pool_alloc_bytes(amqp_pool_t *pool, size_t amount,                                     amqp_bytes_t *output);"
	"Interpreted as #void from #( #'ptr' #'uint64' #'ptr' )"
	^ Function_amqp_pool_alloc_bytes callWith: { pool. amount. output  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_queue_bind_: state _: channel _: queue"struct16bytes" _: exchange"struct16bytes" _: routing_key"struct16bytes" _: arguments"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1004
__attribute__((visibility(""default"")))amqp_queue_bind_ok_t * amqp_queue_bind(    amqp_connection_state_t state, amqp_channel_t channel, amqp_bytes_t queue,    amqp_bytes_t exchange, amqp_bytes_t routing_key, amqp_table_t arguments);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'struct' #'struct' #'struct' )"
	| res args |
	  args := {  state . channel . queue . exchange . routing_key . arguments  } .
	res := Function_amqp_queue_bind callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_queue_declare_: state _: channel _: queue"struct16bytes" _: passive _: durable _: exclusive _: auto_delete _: arguments"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 988
__attribute__((visibility(""default"")))amqp_queue_declare_ok_t * amqp_queue_declare(    amqp_connection_state_t state, amqp_channel_t channel, amqp_bytes_t queue,    amqp_boolean_t passive, amqp_boolean_t durable, amqp_boolean_t exclusive,    amqp_boolean_t auto_delete, amqp_table_t arguments);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'int32' #'int32' #'int32' #'int32' #'struct' )"
	| res args |
	  args := {  state . channel . queue . passive . durable . exclusive . auto_delete . arguments  } .
	res := Function_amqp_queue_declare callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_queue_delete_: state _: channel _: queue"struct16bytes" _: if_unused _: if_empty

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1030
__attribute__((visibility(""default"")))amqp_queue_delete_ok_t * amqp_queue_delete(    amqp_connection_state_t state, amqp_channel_t channel, amqp_bytes_t queue,    amqp_boolean_t if_unused, amqp_boolean_t if_empty);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'int32' #'int32' )"
	| res args |
	  args := {  state . channel . queue . if_unused . if_empty  } .
	res := Function_amqp_queue_delete callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_queue_purge_: state _: channel _: queue"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1016
__attribute__((visibility(""default"")))amqp_queue_purge_ok_t * amqp_queue_purge(amqp_connection_state_t state,                                                  amqp_channel_t channel,                                                  amqp_bytes_t queue);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' )"
	| res args |
	  args := {  state . channel . queue  } .
	res := Function_amqp_queue_purge callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_queue_unbind_: state _: channel _: queue"struct16bytes" _: exchange"struct16bytes" _: routing_key"struct16bytes" _: arguments"struct16bytes"

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1045
__attribute__((visibility(""default"")))amqp_queue_unbind_ok_t * amqp_queue_unbind(    amqp_connection_state_t state, amqp_channel_t channel, amqp_bytes_t queue,    amqp_bytes_t exchange, amqp_bytes_t routing_key, amqp_table_t arguments);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'struct' #'struct' #'struct' #'struct' )"
	| res args |
	  args := {  state . channel . queue . exchange . routing_key . arguments  } .
	res := Function_amqp_queue_unbind callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_read_message_: result"struct32bytes" _: state _: channel _: message _: flags

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2080
__attribute__((visibility(""default"")))amqp_rpc_reply_t amqp_read_message(amqp_connection_state_t state,                                             amqp_channel_t channel,                                             amqp_message_t *message,                                             int flags);"
	"Interpreted as #struct from #( #'ptr' #'uint16' #'ptr' #'int32' )"
	| res args |
	 res := result"resultStruct".
  args := {  state . channel . message . flags  } .
	Function_amqp_read_message callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_release_buffers_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1170
__attribute__((visibility(""default"")))void amqp_release_buffers(amqp_connection_state_t state);"
	"Interpreted as #void from #( #'ptr' )"
	^ Function_amqp_release_buffers callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_release_buffers_ok_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1143
__attribute__((visibility(""default"")))amqp_boolean_t amqp_release_buffers_ok(amqp_connection_state_t state);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_release_buffers_ok callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_send_frame_: state _: frame
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1238
__attribute__((visibility(""default"")))int amqp_send_frame(amqp_connection_state_t state,                              amqp_frame_t const *frame);"
	"Interpreted as #int32 from #( #'ptr' #'ptr' )"
	^ Function_amqp_send_frame callWith: { state. frame  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_send_header_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1308
__attribute__((visibility(""default"")))int amqp_send_header(amqp_connection_state_t state);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_send_header callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_send_method_: state _: channel _: id _: decoded
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1526
__attribute__((visibility(""default"")))int amqp_send_method(amqp_connection_state_t state,                               amqp_channel_t channel, amqp_method_number_t id,                               void *decoded);"
	"Interpreted as #int32 from #( #'ptr' #'uint16' #'uint32' #'ptr' )"
	^ Function_amqp_send_method callWith: { state. channel. id. decoded  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_set_handshake_timeout_: state _: timeout
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2373
__attribute__((visibility(""default"")))int amqp_set_handshake_timeout(amqp_connection_state_t state,                                         const struct timeval *timeout);"
	"Interpreted as #int32 from #( #'ptr' #'ptr' )"
	^ Function_amqp_set_handshake_timeout callWith: { state. timeout  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_set_initialize_ssl_library_: do_initialize
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 229
__attribute__((visibility(""default"")))void amqp_set_initialize_ssl_library(amqp_boolean_t do_initialize);"
	"Interpreted as #void from #( #'int32' )"
	^ Function_amqp_set_initialize_ssl_library callWith: { do_initialize  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_set_rpc_timeout_: state _: timeout
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2431
__attribute__((visibility(""default"")))int amqp_set_rpc_timeout(amqp_connection_state_t state,                                   const struct timeval *timeout);"
	"Interpreted as #int32 from #( #'ptr' #'ptr' )"
	^ Function_amqp_set_rpc_timeout callWith: { state. timeout  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_set_sockfd_: state _: sockfd
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 977
__attribute__((visibility(""default""))) __attribute__ ((__deprecated__)) void    amqp_set_sockfd(amqp_connection_state_t state, int sockfd);"
	"Interpreted as #void from #( #'ptr' #'int32' )"
	^ Function_amqp_set_sockfd callWith: { state. sockfd  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_set_ssl_engine_: engine
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 263
__attribute__((visibility(""default"")))int amqp_set_ssl_engine(const char *engine);"
	"Interpreted as #int32 from #( #'const char*' )"
	^ Function_amqp_set_ssl_engine callWith: { engine  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_simple_rpc_: result"struct32bytes" _: state _: channel _: request_id _: expected_reply_ids _: decoded_request_method

	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1563
__attribute__((visibility(""default"")))amqp_rpc_reply_t amqp_simple_rpc(    amqp_connection_state_t state, amqp_channel_t channel,    amqp_method_number_t request_id, amqp_method_number_t *expected_reply_ids,    void *decoded_request_method);"
	"Interpreted as #struct from #( #'ptr' #'uint16' #'uint32' #'ptr' #'ptr' )"
	| res args |
	 res := result"resultStruct".
  args := {  state . channel . request_id . expected_reply_ids . decoded_request_method  } .
	Function_amqp_simple_rpc callWith: args structResult: res errno: nil.
	 ^ res .
%
category: 'Functions'
method: GsLibRabbitMq
amqp_simple_rpc_decoded_: state _: channel _: request_id _: reply_id _: decoded_request_method
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1583
__attribute__((visibility(""default"")))void * amqp_simple_rpc_decoded(amqp_connection_state_t state,                                        amqp_channel_t channel,                                        amqp_method_number_t request_id,                                        amqp_method_number_t reply_id,                                        void *decoded_request_method);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' #'uint32' #'uint32' #'ptr' )"
	^ Function_amqp_simple_rpc_decoded callWith: { state. channel. request_id. reply_id. decoded_request_method  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_simple_wait_frame_: state _: decoded_frame
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1381
__attribute__((visibility(""default"")))int amqp_simple_wait_frame(amqp_connection_state_t state,                                     amqp_frame_t *decoded_frame);"
	"Interpreted as #int32 from #( #'ptr' #'ptr' )"
	^ Function_amqp_simple_wait_frame callWith: { state. decoded_frame  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_simple_wait_frame_noblock_: state _: decoded_frame _: tv
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1448
__attribute__((visibility(""default"")))int amqp_simple_wait_frame_noblock(amqp_connection_state_t state,                                             amqp_frame_t *decoded_frame,                                             const struct timeval *tv);"
	"Interpreted as #int32 from #( #'ptr' #'ptr' #'ptr' )"
	^ Function_amqp_simple_wait_frame_noblock callWith: { state. decoded_frame. tv  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_simple_wait_method_: state _: expected_channel _: expected_method _: output
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1494
__attribute__((visibility(""default"")))int amqp_simple_wait_method(amqp_connection_state_t state,                                      amqp_channel_t expected_channel,                                      amqp_method_number_t expected_method,                                      amqp_method_t *output);"
	"Interpreted as #int32 from #( #'ptr' #'uint16' #'uint32' #'ptr' )"
	^ Function_amqp_simple_wait_method callWith: { state. expected_channel. expected_method. output  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_socket_get_sockfd_: selfArg
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2283
__attribute__((visibility(""default"")))int amqp_socket_get_sockfd(amqp_socket_t *self);"
	"Interpreted as #int32 from #( #'ptr' )"
	^ Function_amqp_socket_get_sockfd callWith: { selfArg  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_socket_open_: selfArg _: host _: port
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2244
__attribute__((visibility(""default"")))int amqp_socket_open(amqp_socket_t *self, const char *host, int port);"
	"Interpreted as #int32 from #( #'ptr' #'const char*' #'int32' )"
	^ Function_amqp_socket_open callWith: { selfArg. host. port  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_socket_open_noblock_: selfArg _: host _: port _: timeout
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2265
__attribute__((visibility(""default"")))int amqp_socket_open_noblock(amqp_socket_t *self, const char *host,                                       int port, const struct timeval *timeout);"
	"Interpreted as #int32 from #( #'ptr' #'const char*' #'int32' #'ptr' )"
	^ Function_amqp_socket_open_noblock callWith: { selfArg. host. port. timeout  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_get_context_: selfArg
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 49
__attribute__((visibility(""default"")))void * amqp_ssl_socket_get_context(amqp_socket_t *self);"
	"Interpreted as #ptr from #( #'ptr' )"
	^ Function_amqp_ssl_socket_get_context callWith: { selfArg  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_new_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 36
__attribute__((visibility(""default"")))amqp_socket_t * amqp_ssl_socket_new(amqp_connection_state_t state);"
	"Interpreted as #ptr from #( #'ptr' )"
	^ Function_amqp_ssl_socket_new callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_set_cacert_: selfArg _: cacert
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 63
__attribute__((visibility(""default"")))int amqp_ssl_socket_set_cacert(amqp_socket_t *self,                                         const char *cacert);"
	"Interpreted as #int32 from #( #'ptr' #'const char*' )"
	^ Function_amqp_ssl_socket_set_cacert callWith: { selfArg. cacert  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_set_key_: selfArg _: cert _: key
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 91
__attribute__((visibility(""default"")))int amqp_ssl_socket_set_key(amqp_socket_t *self, const char *cert,                                      const char *key);"
	"Interpreted as #int32 from #( #'ptr' #'const char*' #'const char*' )"
	^ Function_amqp_ssl_socket_set_key callWith: { selfArg. cert. key  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_set_key_buffer_: selfArg _: cert _: key _: n
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 126
__attribute__((visibility(""default"")))int amqp_ssl_socket_set_key_buffer(amqp_socket_t *self,                                             const char *cert, const void *key,                                             size_t n);"
	"Interpreted as #int32 from #( #'ptr' #'const char*' #'ptr' #'uint64' )"
	^ Function_amqp_ssl_socket_set_key_buffer callWith: { selfArg. cert. key. n  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_set_key_engine_: selfArg _: cert _: key
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 109
__attribute__((visibility(""default"")))int amqp_ssl_socket_set_key_engine(amqp_socket_t *self,                                             const char *cert, const char *key);"
	"Interpreted as #int32 from #( #'ptr' #'const char*' #'const char*' )"
	^ Function_amqp_ssl_socket_set_key_engine callWith: { selfArg. cert. key  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_set_key_passwd_: selfArg _: passwd
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 75
__attribute__((visibility(""default"")))void amqp_ssl_socket_set_key_passwd(amqp_socket_t *self,                                              const char *passwd);"
	"Interpreted as #void from #( #'ptr' #'const char*' )"
	^ Function_amqp_ssl_socket_set_key_passwd callWith: { selfArg. passwd  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_set_ssl_versions_: selfArg _: min _: max
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 201
__attribute__((visibility(""default"")))int amqp_ssl_socket_set_ssl_versions(amqp_socket_t *self,                                               amqp_tls_version_t min,                                               amqp_tls_version_t max);"
	"Interpreted as #int32 from #( #'ptr' #'int32' #'int32' )"
	^ Function_amqp_ssl_socket_set_ssl_versions callWith: { selfArg. min. max  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_set_verify_: selfArg _: verify
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 146
__attribute__((visibility(""default""))) __attribute__ ((__deprecated__)) void    amqp_ssl_socket_set_verify(amqp_socket_t *self, amqp_boolean_t verify);"
	"Interpreted as #void from #( #'ptr' #'int32' )"
	^ Function_amqp_ssl_socket_set_verify callWith: { selfArg. verify  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_set_verify_hostname_: selfArg _: verify
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 173
__attribute__((visibility(""default"")))void amqp_ssl_socket_set_verify_hostname(amqp_socket_t *self,                                                   amqp_boolean_t verify);"
	"Interpreted as #void from #( #'ptr' #'int32' )"
	^ Function_amqp_ssl_socket_set_verify_hostname callWith: { selfArg. verify  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_ssl_socket_set_verify_peer_: selfArg _: verify
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socket.h line 160
__attribute__((visibility(""default"")))void amqp_ssl_socket_set_verify_peer(amqp_socket_t *self,                                               amqp_boolean_t verify);"
	"Interpreted as #void from #( #'ptr' #'int32' )"
	^ Function_amqp_ssl_socket_set_verify_peer callWith: { selfArg. verify  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_table_clone_: original _: clone _: pool
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 2046
__attribute__((visibility(""default"")))int amqp_table_clone(const amqp_table_t *original,                               amqp_table_t *clone, amqp_pool_t *pool);"
	"Interpreted as #int32 from #( #'ptr' #'ptr' #'ptr' )"
	^ Function_amqp_table_clone callWith: { original. clone. pool  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_table_entry_cmp_: entry1 _: entry2
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1254
__attribute__((visibility(""default"")))int amqp_table_entry_cmp(void const *entry1, void const *entry2);"
	"Interpreted as #int32 from #( #'ptr' #'ptr' )"
	^ Function_amqp_table_entry_cmp callWith: { entry1. entry2  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_tcp_socket_new_: state
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/tcp_socket.h line 27
__attribute__((visibility(""default"")))amqp_socket_t * amqp_tcp_socket_new(amqp_connection_state_t state);"
	"Interpreted as #ptr from #( #'ptr' )"
	^ Function_amqp_tcp_socket_new callWith: { state  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_tcp_socket_set_sockfd_: selfArg _: sockfd
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/tcp_socket.h line 42
__attribute__((visibility(""default"")))void amqp_tcp_socket_set_sockfd(amqp_socket_t *self, int sockfd);"
	"Interpreted as #void from #( #'ptr' #'int32' )"
	^ Function_amqp_tcp_socket_set_sockfd callWith: { selfArg. sockfd  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_tune_connection_: state _: channel_max _: frame_max _: heartbeat
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 1012
__attribute__((visibility(""default"")))int amqp_tune_connection(amqp_connection_state_t state,                                   int channel_max, int frame_max,                                   int heartbeat);"
	"Interpreted as #int32 from #( #'ptr' #'int32' #'int32' #'int32' )"
	^ Function_amqp_tune_connection callWith: { state. channel_max. frame_max. heartbeat  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_tx_commit_: state _: channel
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1124
__attribute__((visibility(""default"")))amqp_tx_commit_ok_t * amqp_tx_commit(amqp_connection_state_t state,                                              amqp_channel_t channel);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' )"
	^ Function_amqp_tx_commit callWith: { state. channel  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_tx_rollback_: state _: channel
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1134
__attribute__((visibility(""default"")))amqp_tx_rollback_ok_t * amqp_tx_rollback(amqp_connection_state_t state,                                                  amqp_channel_t channel);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' )"
	^ Function_amqp_tx_rollback callWith: { state. channel  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_tx_select_: state _: channel
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/framing.h line 1114
__attribute__((visibility(""default"")))amqp_tx_select_ok_t * amqp_tx_select(amqp_connection_state_t state,                                              amqp_channel_t channel);"
	"Interpreted as #ptr from #( #'ptr' #'uint16' )"
	^ Function_amqp_tx_select callWith: { state. channel  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_uninitialize_ssl_library
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/ssl_socketh line 273
__attribute__((visibility(""default"")))int amqp_uninitialize_ssl_library(void);"
	"Interpreted as #int32 from #( )"
	^ Function_amqp_uninitialize_ssl_library callWith: {  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_version
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqph line 213
__attribute__((visibility(""default"")))char const * amqp_version(void);"
	"Interpreted as #char* from #( )"
	^ Function_amqp_version callWith: {  }
%
category: 'Functions'
method: GsLibRabbitMq
amqp_version_number
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqph line 199
__attribute__((visibility(""default"")))uint32_t amqp_version_number(void);"
	"Interpreted as #uint32 from #( )"
	^ Function_amqp_version_number callWith: {  }
%
category: 'Functions'
method: GsLibRabbitMq
empty_amqp_pool_: pool
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 806
__attribute__((visibility(""default"")))void empty_amqp_pool(amqp_pool_t *pool);"
	"Interpreted as #void from #( #'ptr' )"
	^ Function_empty_amqp_pool callWith: { pool  }
%
category: 'Functions'
method: GsLibRabbitMq
init_amqp_pool_: pool _: pagesize
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 771
__attribute__((visibility(""default"")))void init_amqp_pool(amqp_pool_t *pool, size_t pagesize);"
	"Interpreted as #void from #( #'ptr' #'uint64' )"
	^ Function_init_amqp_pool callWith: { pool. pagesize  }
%
category: 'Converting'
method: GsLibRabbitMq
methodNumberToString: anInt

	| result |
	^(result := self amqp_method_name_: anInt)
		ifNil: ['unknown method number']
		ifNotNil: [result]
%
category: 'Functions'
method: GsLibRabbitMq
recycle_amqp_pool_: pool
	"/moop3/users/normg/rabbitmq_inst/include/rabbitmq-c/amqp.h line 794
__attribute__((visibility(""default"")))void recycle_amqp_pool(amqp_pool_t *pool);"
	"Interpreted as #void from #( #'ptr' )"
	^ Function_recycle_amqp_pool callWith: { pool  }
%
! ------------------- Remove existing behavior from GsAmqpMessage
removeAllMethods GsAmqpMessage
removeAllClassMethods GsAmqpMessage
! ------------------- Class methods for GsAmqpMessage
category: 'Constants'
classmethod: GsAmqpMessage
defaultBodyClass

^ String
%
category: 'Instance Creation'
classmethod: GsAmqpMessage
fromCPointer: aCByteArray atOffset: offset bodyClass: aByteClass

	| res |
	res := self fromCPointer: aCByteArray atOffset: offset initializeFromC: false.
	res bodyClass: aByteClass.
	^ res initializeFromC
%
category: 'Instance Creation'
classmethod: GsAmqpMessage
fromCPointer: aCByteArray bodyClass: aByteClass

	^self fromCPointer: aCByteArray atOffset: 0 bodyClass: aByteClass
%
category: 'Constants'
classmethod: GsAmqpMessage
sizeInC

^ 280
%
! ------------------- Instance methods for GsAmqpMessage
category: 'Accessing'
method: GsAmqpMessage
body
	^body
%
category: 'Updating'
method: GsAmqpMessage
body: newValue
	body := newValue
%
category: 'Accessing'
method: GsAmqpMessage
bodyClass
	^bodyClass
%
category: 'Updating'
method: GsAmqpMessage
bodyClass: newValue
	bodyClass := newValue
%
category: 'Memory Management'
method: GsAmqpMessage
destroyCStateUsingLibrary: lib

self destroyed ifFalse:[
	self destroyed: true.
	lib amqp_destroy_message_: self.
	self zeroMemory .
].
^ self

%
category: 'Accessing'
method: GsAmqpMessage
destroyed
	^destroyed
%
category: 'Updating'
method: GsAmqpMessage
destroyed: newValue
	destroyed := newValue
%
category: 'Initialization'
method: GsAmqpMessage
initialize

	^self
		destroyed: false;
		bodyClass: String;
		yourself
%
category: 'Initialization'
method: GsAmqpMessage
initializeFromC

	self bodyClass ifNil:[ self bodyClass: self class defaultBodyClass ].
	^self destroyed
		ifTrue:
			[self error: 'Attempt to initialize from C an already destroyed message']
		ifFalse:
			[self
				properties: (GsAmqpBasicProperties fromCPointer: self);
				body: (self byteObjectFromAmqpBytesAtOffset: 200 class: self bodyClass);
				yourself]
%
category: 'Accessing'
method: GsAmqpMessage
properties
	^properties
%
category: 'Updating'
method: GsAmqpMessage
properties: newValue
	properties := newValue
%
! ------------------- Remove existing behavior from GsAmqpBytes
removeAllMethods GsAmqpBytes
removeAllClassMethods GsAmqpBytes
! ------------------- Class methods for GsAmqpBytes
category: 'Constants'
classmethod: GsAmqpBytes
addressOffset

"Zero-based offset of the char * in the receiver's C memory. Note the result is NOT null terminated!"

^ 8
%
category: 'Instance Creation'
classmethod: GsAmqpBytes
emptyBytes

"Return a new instance containing no data"

^ self new
%
category: 'Instance Creation'
classmethod: GsAmqpBytes
fromBytes: byteObj

	^(byteObj size == 0) "Handle both empty byteObj and nil"
		ifTrue: [self emptyBytes]
		ifFalse:
			[| cba res |
			cba := CByteArray withAll: byteObj nullTerminate: false.
			(res := self new)
				bytes: cba;
				len: cba size.
			res]
%
category: 'Instance Creation'
classmethod: GsAmqpBytes
fromString: aString

	^self fromBytes: aString
%
category: 'Instance Creation'
classmethod: GsAmqpBytes
fromStringEncodeAsUtf8: byteObj

	^(byteObj size == 0) "Handle both empty byteObj and nil"
		ifTrue: [self emptyBytes]
		ifFalse:
			[| cba res |
			cba := CByteArray gcMalloc: byteObj size.
			cba encodeUTF8From: byteObj into: 0 allowCodePointZero: false.
			(res := self new)
				bytes: cba;
				len: cba size.
			res]
%
category: 'Instance Creation'
classmethod: GsAmqpBytes
fromStringOrNil: aString

"Similar to #fromString: except return a nil if the argument is nil"
^ aString ifNil:[nil] ifNotNil:[ self fromString: aString ]
%
category: 'Constants'
classmethod: GsAmqpBytes
lengthOffset

"Zero-based offset of size of the string in the receiver's C memory."

^ 0
%
category: 'Constants'
classmethod: GsAmqpBytes
sizeInC

^ 16
%
! ------------------- Instance methods for GsAmqpBytes
category: 'Formatting'
method: GsAmqpBytes
asString


^ self printString
%
category: 'Accessing'
method: GsAmqpBytes
bytes

"Return nil if the receiver references a NULL string. Othwerwise answer a CByteArray"
	^self
		pointerAt: 8
		resultClass: CByteArray.
%
category: 'Updating'
method: GsAmqpBytes
bytes: aCByteArray
	"generated by CDeclaration>>singlePointerUpdatorForOffset:"

	^ self
		pointerAt: 8 put: aCByteArray;
		derivedFrom: aCByteArray ;
		yourself
%
category: 'Accessing'
method: GsAmqpBytes
bytesAddress
	   "generated by CDeclaration>>singlePointerAccessorForOffset:"
	^self uint64At: 8
%
category: 'Converting'
method: GsAmqpBytes
convertToByteArray

	| length |
	^(length := self len) == 0
		ifTrue: [String new]
		ifFalse:
			[self byteArrayFromCharStarAt: 8 numBytes: length]
%
category: 'Converting'
method: GsAmqpBytes
convertToString

	| length |
	^(length := self len) == 0
		ifTrue: [String new]
		ifFalse:
			[self stringFromCharStarAt: 8 numBytes: length]
%
category: 'Initialization'
method: GsAmqpBytes
initialize: aCByteArray
  | sz |
  sz := self size min: aCByteArray size .
  self copyBytesFrom: aCByteArray from: 1 to: sz into: 0 allowCodePointZero: true .
%
category: 'Initialization'
method: GsAmqpBytes
initializeFromC

^ self
%
category: 'Accessing'
method: GsAmqpBytes
len
	   "generated by CDeclaration>>simpleAccessorForOffset: 0 "
	^ self uint64At: 0
%
category: 'Updating'
method: GsAmqpBytes
len: anObject
	"generated by CDeclaration>>simpleUpdatorForOffset: 0 "

	^self
		uint64At: 0 put: anObject;
		yourself
%
category: 'Formatting'
method: GsAmqpBytes
printString

^ (self class name describeClassName), '(', self convertToString , ')'
%
! ------------------- Remove existing behavior from GsAmqpBasicDeliveryPayload
removeAllMethods GsAmqpBasicDeliveryPayload
removeAllClassMethods GsAmqpBasicDeliveryPayload
! ------------------- Class methods for GsAmqpBasicDeliveryPayload
category: 'Constants'
classmethod: GsAmqpBasicDeliveryPayload
sizeInC

^ 64
%
! ------------------- Instance methods for GsAmqpBasicDeliveryPayload
category: 'Accessing'
method: GsAmqpBasicDeliveryPayload
consumerTag
	^consumerTag
%
category: 'Updating'
method: GsAmqpBasicDeliveryPayload
consumerTag: newValue
	consumerTag := newValue
%
category: 'Accessing'
method: GsAmqpBasicDeliveryPayload
deliveryTag
	^deliveryTag
%
category: 'Updating'
method: GsAmqpBasicDeliveryPayload
deliveryTag: newValue
	deliveryTag := newValue
%
category: 'Accessing'
method: GsAmqpBasicDeliveryPayload
exchange
	^exchange
%
category: 'Updating'
method: GsAmqpBasicDeliveryPayload
exchange: newValue
	exchange := newValue
%
category: 'Initialization'
method: GsAmqpBasicDeliveryPayload
initializeFromC

self consumerTag: (self stringFromAmqpBytesAtOffset: 0) ;
	deliveryTag: (self uint64At: 16) ;
	redelivered: (self booleanAtOffset: 24) ; "integer to boolean"
	exchange: (self stringFromAmqpBytesAtOffset: 32) ;
	routingKey: (self stringFromAmqpBytesAtOffset: 48) ;
	yourself
%
category: 'Accessing'
method: GsAmqpBasicDeliveryPayload
redelivered
	^redelivered
%
category: 'Updating'
method: GsAmqpBasicDeliveryPayload
redelivered: newValue
	redelivered := newValue
%
category: 'Accessing'
method: GsAmqpBasicDeliveryPayload
routingKey
	^routingKey
%
category: 'Updating'
method: GsAmqpBasicDeliveryPayload
routingKey: newValue
	routingKey := newValue
%
! ------------------- Remove existing behavior from GsAmqpMethod
removeAllMethods GsAmqpMethod
removeAllClassMethods GsAmqpMethod
! ------------------- Class methods for GsAmqpMethod
category: 'Constants'
classmethod: GsAmqpMethod
AMQP_BASIC_ACK_METHOD

^ 16r003C0050
%
category: 'Constants'
classmethod: GsAmqpMethod
AMQP_BASIC_DELIVER_METHOD

^ 16r003C003C
%
category: 'Constants'
classmethod: GsAmqpMethod
AMQP_BASIC_NACK_METHOD

^ 16r003C0078
%
category: 'Constants'
classmethod: GsAmqpMethod
AMQP_BASIC_REJECT_METHOD

^ 16r003C005A
%
category: 'Constants'
classmethod: GsAmqpMethod
AMQP_BASIC_RETURN_METHOD

^ 16r003C0032
%
category: 'Constants'
classmethod: GsAmqpMethod
AMQP_CHANNEL_CLOSE_METHOD

^ 16r140028
%
category: 'Constants'
classmethod: GsAmqpMethod
AMQP_CONNECTION_CLOSE_METHOD

^ 16rA0032
%
category: 'Instance Creation'
classmethod: GsAmqpMethod
fromRpcReply: rpcReply

	^ (self fromCPointer: rpcReply atOffset: 8 initializeFromC: false)
		connection: rpcReply connection; "Set connection before calling initializeFromC"
		initializeFromC;
		yourself
%
category: 'Constants'
classmethod: GsAmqpMethod
sizeInC

^ 16
%
! ------------------- Instance methods for GsAmqpMethod
category: 'Accessing'
method: GsAmqpMethod
connection
	^connection
%
category: 'Updating'
method: GsAmqpMethod
connection: newValue
	connection := newValue
%
category: 'Accessing'
method: GsAmqpMethod
decoded
	^decoded
%
category: 'Updating'
method: GsAmqpMethod
decoded: newValue
	decoded := newValue
%
category: 'Initialization'
method: GsAmqpMethod
decodeMethodObject

	self isBasicAck
		ifTrue: [^GsAmqpBasicAck fromMemoryReferenceIn: self atOffset: 8].
	self isBasicNack
		ifTrue: [^GsAmqpBasicNack fromMemoryReferenceIn: self atOffset: 8].
	self isBasicReject
		ifTrue: [^GsAmqpBasicReject fromMemoryReferenceIn: self atOffset: 8].
	self isBasicReturn
		ifTrue: [^GsAmqpBasicReturn fromMemoryReferenceIn: self atOffset: 8].
	self isConnectionClose
		ifTrue: "broker closed the connection, raise an exception"
			[ ^ GsAmqpConnectionClose fromMemoryReferenceIn: self atOffset: 8
			" | close |
			close := GsAmqpConnectionClose fromMemoryReferenceIn: self atOffset: 8.
			^(GsRabbitMqError newFromConnectionClose: close) signal "
		].
	self isChannelClose
		ifTrue: "broker closed the connection, raise an exception"
			[ GsAmqpChannelClose fromMemoryReferenceIn: self atOffset: 8.
			"| close |
			close := GsAmqpChannelClose fromMemoryReferenceIn: self atOffset: 8.
			^(GsRabbitMqError newFromChannelClose: close) signal"
		].
	^self error: 'Unexpected method object'
%
category: 'Testing'
method: GsAmqpMethod
hasContent

"See amqp_framing.c. Only these method kinds have content, all others do not:

    AMQP_BASIC_PUBLISH_METHOD
    AMQP_BASIC_RETURN_METHOD
    AMQP_BASIC_DELIVER_METHOD
    AMQP_BASIC_GET_OK_METHOD
"

^ self connection methodNumberHasContent: self methodNumber
%
category: 'Initialization'
method: GsAmqpMethod
initializeFromC

^ self methodNumber: (self uint32At: 0) ;
	methodName: (self connection library amqp_method_name_: self methodNumber);
	decoded: (self uint64At: 8) ;
	methodObject: self decodeMethodObject ;
	yourself
%
category: 'Testing'
method: GsAmqpMethod
isBasicAck

^ self methodNumber == self class AMQP_BASIC_ACK_METHOD
%
category: 'Testing'
method: GsAmqpMethod
isBasicDeliver

^ self methodNumber == self class AMQP_BASIC_DELIVER_METHOD
%
category: 'Testing'
method: GsAmqpMethod
isBasicNack

^ self methodNumber == self class AMQP_BASIC_NACK_METHOD
%
category: 'Testing'
method: GsAmqpMethod
isBasicReject

^ self methodNumber == self class AMQP_BASIC_REJECT_METHOD
%
category: 'Testing'
method: GsAmqpMethod
isBasicReturn

^ self methodNumber == self class AMQP_BASIC_RETURN_METHOD
%
category: 'Testing'
method: GsAmqpMethod
isChannelClose

^ self methodNumber == self class AMQP_CHANNEL_CLOSE_METHOD
%
category: 'Testing'
method: GsAmqpMethod
isConnectionClose

^ self methodNumber == self class AMQP_CONNECTION_CLOSE_METHOD
%
category: 'Accessing'
method: GsAmqpMethod
methodName
	^methodName
%
category: 'Updating'
method: GsAmqpMethod
methodName: newValue
	methodName := newValue
%
category: 'Accessing'
method: GsAmqpMethod
methodNumber
	^methodNumber
%
category: 'Updating'
method: GsAmqpMethod
methodNumber: newValue
	methodNumber := newValue
%
category: 'Accessing'
method: GsAmqpMethod
methodObject
	^methodObject
%
category: 'Updating'
method: GsAmqpMethod
methodObject: newValue
	methodObject := newValue
%
category: 'Testing'
method: GsAmqpMethod
shortName

self isBasicAck ifTrue:[ ^ 'ack' ].
self isBasicNack ifTrue:[ ^ 'nack' ].
self isBasicReject ifTrue:[ ^ 'reject' ].
self isBasicReturn ifTrue:[ ^ 'return' ].
^ self error: 'Unexpected method for shortName'
%
! ------------------- Remove existing behavior from GsAmqpEnvelope
removeAllMethods GsAmqpEnvelope
removeAllClassMethods GsAmqpEnvelope
! ------------------- Class methods for GsAmqpEnvelope
category: 'Constants'
classmethod: GsAmqpEnvelope
defaultMessageBodyClass

^ String
%
category: 'Instance Creation'
classmethod: GsAmqpEnvelope
newForBinaryMessage

^ self newWithMessageBodyClass: ByteArray
%
category: 'Instance Creation'
classmethod: GsAmqpEnvelope
newWithMessageBodyClass: aByteClass

	aByteClass _validateIsClass.
	aByteClass isBytes ifFalse: [aByteClass _error: #objErrNotByteKind].
	^(super new)
		messageBodyClass: aByteClass;
		yourself
%
category: 'Constants'
classmethod: GsAmqpEnvelope
sizeInC

^ 352
%
! ------------------- Instance methods for GsAmqpEnvelope
category: 'Accessing'
method: GsAmqpEnvelope
channel
	^channel
%
category: 'Updating'
method: GsAmqpEnvelope
channel: newValue
	channel := newValue
%
category: 'Reusing'
method: GsAmqpEnvelope
clearForReuse

^ self reinitialize ; zeroMemory
%
category: 'Accessing'
method: GsAmqpEnvelope
consumerTag
	^consumerTag
%
category: 'Updating'
method: GsAmqpEnvelope
consumerTag: newValue
	consumerTag := newValue
%
category: 'Accessing'
method: GsAmqpEnvelope
deliveryTag
	^deliveryTag
%
category: 'Updating'
method: GsAmqpEnvelope
deliveryTag: newValue
	deliveryTag := newValue
%
category: 'Memory Management'
method: GsAmqpEnvelope
destroyCStateUsingLibrary: lib

self destroyed ifFalse:[
	self destroyed: true.
	lib amqp_destroy_envelope_: self.
	self zeroMemory.
].
^ self

%
category: 'Accessing'
method: GsAmqpEnvelope
destroyed
	^destroyed
%
category: 'Updating'
method: GsAmqpEnvelope
destroyed: newValue
	destroyed := newValue
%
category: 'Accessing'
method: GsAmqpEnvelope
exchange
	^exchange
%
category: 'Updating'
method: GsAmqpEnvelope
exchange: newValue
	exchange := newValue
%
category: 'Initialization'
method: GsAmqpEnvelope
initialize

	^self
		destroyed: false;
		initializeMessageBodyClass;
		yourself
%
category: 'Initialization'
method: GsAmqpEnvelope
initializeFromC

	self initializeMessageBodyClass.
	^ self destroyed
		ifTrue:
			[self error: 'Attempt to initialize from C an already destroyed envelope']
		ifFalse:
			[self
				channel: (self uint32At: 0);
				consumerTag: (self stringFromAmqpBytesAtOffset: 8);
				deliveryTag: (self uint64At: 24);
				redelivered: (self booleanAtOffset: 32);
				exchange: (self stringFromAmqpBytesAtOffset: 40);
				routingKey: (self stringFromAmqpBytesAtOffset: 56);
				message: (GsAmqpMessage fromCPointer: self atOffset: 72 bodyClass: self messageBodyClass );
				yourself	"integer to boolean"]
%
category: 'Initialization'
method: GsAmqpEnvelope
initializeMessageBodyClass

	self messageBodyClass
		ifNil: [self messageBodyClass: self class defaultMessageBodyClass].
	^self
%
category: 'Accessing'
method: GsAmqpEnvelope
message
	^message
%
category: 'Updating'
method: GsAmqpEnvelope
message: newValue
	message := newValue
%
category: 'Accessing'
method: GsAmqpEnvelope
messageBody

^ message ifNil:[ nil ] ifNotNil:[ message body ]
%
category: 'Accessing'
method: GsAmqpEnvelope
messageBodyClass
	^messageBodyClass
%
category: 'Updating'
method: GsAmqpEnvelope
messageBodyClass: newValue
	messageBodyClass := newValue
%
category: 'Accessing'
method: GsAmqpEnvelope
redelivered
	^redelivered
%
category: 'Updating'
method: GsAmqpEnvelope
redelivered: newValue
	redelivered := newValue
%
category: 'Initialization'
method: GsAmqpEnvelope
reinitialize

^ self destroyed: false ;
	yourself
%
category: 'Accessing'
method: GsAmqpEnvelope
routingKey
	^routingKey
%
category: 'Updating'
method: GsAmqpEnvelope
routingKey: newValue
	routingKey := newValue
%
! ------------------- Remove existing behavior from GsAmqpBasicNack
removeAllMethods GsAmqpBasicNack
removeAllClassMethods GsAmqpBasicNack
! ------------------- Class methods for GsAmqpBasicNack
! ------------------- Instance methods for GsAmqpBasicNack
category: 'Initialization'
method: GsAmqpBasicNack
initializeFromC

	super initializeFromC.
	^self
		requeue: (self booleanAtOffset: 12);
		yourself
%
category: 'Accessing'
method: GsAmqpBasicNack
requeue
	^requeue
%
category: 'Updating'
method: GsAmqpBasicNack
requeue: newValue
	requeue := newValue
%
! ------------------- Remove existing behavior from GsAmqpBasicReject
removeAllMethods GsAmqpBasicReject
removeAllClassMethods GsAmqpBasicReject
! ------------------- Class methods for GsAmqpBasicReject
category: 'Constants'
classmethod: GsAmqpBasicReject
sizeInC

^ 16
%
! ------------------- Instance methods for GsAmqpBasicReject
category: 'Accessing'
method: GsAmqpBasicReject
deliveryTag
	^deliveryTag
%
category: 'Updating'
method: GsAmqpBasicReject
deliveryTag: newValue
	deliveryTag := newValue
%
category: 'Initialization'
method: GsAmqpBasicReject
initializeFromC

^ self deliveryTag: (self uint64At: 0) ;
		requeue: (self booleanAtOffset: 8);
		yourself
%
category: 'Accessing'
method: GsAmqpBasicReject
requeue
	^requeue
%
category: 'Updating'
method: GsAmqpBasicReject
requeue: newValue
	requeue := newValue
%
! ------------------- Remove existing behavior from GsAmqpQueue
removeAllMethods GsAmqpQueue
removeAllClassMethods GsAmqpQueue
! ------------------- Class methods for GsAmqpQueue
category: 'Instance Creation'
classmethod: GsAmqpQueue
declareWithConnection: conn durable: durable exclusive: exclusive autoDelete: autoDelete

^ self declareWithConnection: conn name: nil channel: nil durable: durable exclusive: exclusive autoDelete: autoDelete
%
category: 'Instance Creation'
classmethod: GsAmqpQueue
declareWithConnection: conn name: qName channel: channelIdArg durable: durable exclusive: exclusive autoDelete: autoDelete
	"qName == nil means name of queue will be selected by the broker.
channelIdArg == nil means use any open channel and raise an error if no channels are open."

	| qResult result channelId |
	channelId := channelIdArg
				ifNil: [conn openNextChannel]
				ifNotNil: [channelIdArg].
	qResult := conn
				declareQueueWithName: qName
				channel: channelId
				durable: durable
				exclusive: exclusive
				autoDelete: autoDelete
				passive: false .
	result := self new.
	^result
		connection: conn;
		channel: channelId;
		name: qResult queueName;
		durable: durable;
		exclusive: exclusive;
		autoDelete: autoDelete;
		yourself
%
! ------------------- Instance methods for GsAmqpQueue
category: 'Acknowlegements'
method: GsAmqpQueue
ackEnvelope: env

^ self ackEnvelope: env includePreviousMessages: false
%
category: 'Acknowlegements'
method: GsAmqpQueue
ackEnvelope: env includePreviousMessages: includePrev

	^ self connection
		ackMessageWithDeliveryTag: env deliveryTag
		channel: self channel
		multiple: includePrev
%
category: 'Acknowlegements'
method: GsAmqpQueue
ackEnvelopeAndAllPrevious: env

^ self ackEnvelope: env includePreviousMessages: true
%
category: 'Private'
method: GsAmqpQueue
addMatchToAllToDictionary: aDictionary

	aDictionary at: self matchKey ifAbsentPut: [self matchAllValue].
	^self
%
category: 'Private'
method: GsAmqpQueue
addMatchToAllToKeys: keys values: values

keys detect:[:e| e = self matchKey ] ifNone:[
	keys add: self matchKey.
	values add: self matchAllValue.
].
%
category: 'Private'
method: GsAmqpQueue
addMatchToAnyToDictionary: aDictionary

	aDictionary at: self matchKey ifAbsentPut: [self matchAnyValue].
	^self
%
category: 'Private'
method: GsAmqpQueue
addMatchToAnyToKeys: keys values: values

keys detect:[:e| e = self matchKey ] ifNone:[
	keys add: self matchKey.
	values add: self matchAnyValue
].
%
category: 'Private'
method: GsAmqpQueue
basicBindToHeadersExchange: exchg matchKeys: keys values: values

| exchgName args |
args := GsAmqpTable newFromKeys: keys values: values.
exchgName := (exchg isKindOf: String) ifTrue:[ exchg ] ifFalse:[ exchg name ].
self connection bindQueueWithName: self name toExchangeWithName: exchgName channel: self channel routingKey: nil arguments: args.
^ self
%
category: 'Private'
method: GsAmqpQueue
basicBindToHeadersExchange: exchg withHeadersDictionary: aDictionary

| exchgName args |
args := GsAmqpTable  newFromDictionary: aDictionary .
exchgName := (exchg isKindOf: String) ifTrue:[ exchg ] ifFalse:[ exchg name ].
self connection bindQueueWithName: self name toExchangeWithName: exchgName channel: self channel routingKey: nil arguments: args.
^ self
%
category: 'Consuming'
method: GsAmqpQueue
beginConsumingWithNoLocal: noLocal noAck: noAck

	| tag |
	tag := self connection
				beginConsumingQueueWithName: self name
				channel: self channel
				consumerTag: self consumerTag
				noLocal: noLocal
				noAck: noAck
				exclusive: self exclusive.
	self consumerTag ifNil: [self consumerTag: tag].
	^self
%
category: 'Binding'
method: GsAmqpQueue
bindToExchange: exchg

^ self bindToExchange: exchg routingKey: nil
%
category: 'Binding'
method: GsAmqpQueue
bindToExchange: exchg routingKey: rKey

| exchgName |
exchgName := (exchg isKindOf: String) ifTrue:[ exchg ] ifFalse:[ exchg name ].
self connection bindQueueWithName: self name toExchangeWithName: exchgName channel: self channel routingKey: rKey .
self exchange: exchg.
^ self
%
category: 'Binding (Headers Exchanges)'
method: GsAmqpQueue
bindToHeadersExchange: exchg matchAllInDictionary: aDictionary

self addMatchToAllToDictionary: aDictionary.
^ self basicBindToHeadersExchange: exchg withHeadersDictionary: aDictionary.
%
category: 'Binding (Headers Exchanges)'
method: GsAmqpQueue
bindToHeadersExchange: exchg matchAllKeys: keys values: values

self addMatchToAllToKeys: keys values: values.
^ self basicBindToHeadersExchange: exchg matchKeys: keys values: values
%
category: 'Binding (Headers Exchanges)'
method: GsAmqpQueue
bindToHeadersExchange: exchg matchAnyInDictionary: aDictionary

self addMatchToAnyToDictionary: aDictionary.
^ self basicBindToHeadersExchange: exchg withHeadersDictionary: aDictionary.
%
category: 'Binding (Headers Exchanges)'
method: GsAmqpQueue
bindToHeadersExchange: exchg matchAnyKeys: keys values: values

self addMatchToAnyToKeys: keys values: values.
^ self basicBindToHeadersExchange: exchg matchKeys: keys values: values
%
category: 'Consuming'
method: GsAmqpQueue
consumeMessageInto: aGsAmqpEnvelope timeoutMs: ms

^self connection consumeMessageInto: aGsAmqpEnvelope timeoutMs: ms
%
category: 'Accessing'
method: GsAmqpQueue
consumerTag
	^consumerTag
%
category: 'Updating'
method: GsAmqpQueue
consumerTag: newValue
	consumerTag := newValue
%
category: 'Deleting'
method: GsAmqpQueue
deleteForceIfInUse: forceIfInUse forceIfNotEmpty:  forceIfNotEmpty

"Delete the receiver from the broker.
If forceIfInUse is true then delete the queue even if it has consumers. Otherwise do not delete it and raise an exception.
If forceIfNotEmpty is true, then delete the queue even if it is not empty. Otherwise do not delete it and raise an exception."

	^self connection
		deleteQueueWithName: self name
		channel: self channel
		forceIfInUse: forceIfInUse
		forceIfNotEmpty: forceIfNotEmpty
%
category: 'Deleting'
method: GsAmqpQueue
deleteIfSafe

^ self deleteForceIfInUse: false forceIfNotEmpty:  false
%
category: 'Accessing'
method: GsAmqpQueue
exchange
	^exchange
%
category: 'Updating'
method: GsAmqpQueue
exchange: newValue
	exchange := newValue
%
category: 'Accessing'
method: GsAmqpQueue
exclusive
	^exclusive
%
category: 'Updating'
method: GsAmqpQueue
exclusive: newValue
	exclusive := newValue
%
category: 'Deleting'
method: GsAmqpQueue
forceDelete

^ self deleteForceIfInUse: true forceIfNotEmpty:  true
%
category: 'Private'
method: GsAmqpQueue
matchAllValue

^ 'all'
%
category: 'Private'
method: GsAmqpQueue
matchAnyValue

^ 'any'
%
category: 'Private'
method: GsAmqpQueue
matchKey

^ 'x-match'
%
category: 'Accessing'
method: GsAmqpQueue
routingKey
	^routingKey
%
category: 'Updating'
method: GsAmqpQueue
routingKey: newValue
	routingKey := newValue
%
category: 'Accessing'
method: GsAmqpQueue
size

^self connection sizeOfQueueWithName: self name channel: self channel
%
category: 'Consuming'
method: GsAmqpQueue
stopConsuming

"Tell the broker we are no longer consuming this queue. Has no effect if we were not consuming the queue to start with.
Note that the broker may have sent messages before it  processed the message to stop consuming. It is therefore the caller's
responsibility to check the queue for any outstanding messages after calling this method."

	| tag |
	(tag := self consumerTag)
		ifNotNil:
			[self connection stopConsumingQueueOnChannel: self channel
				consumerTag: tag.
			self consumerTag: nil].
	^self
%
category: 'Binding'
method: GsAmqpQueue
unbind

| exchgName exchg |
(exchg := self exchange) ifNil: [ ^ self "was not bound" ].
exchgName := (exchg isKindOf: String) ifTrue:[exchg] ifFalse:[ exchg name ].
self connection unbindQueueWithName: self name fromExchangeWithName: exchgName channel: self channel routingKey: self routingKey .
^ self exchange: nil ; consumerTag: nil ;  yourself
%
! ------------------- Remove existing behavior from GsAmqpFrame
removeAllMethods GsAmqpFrame
removeAllClassMethods GsAmqpFrame
! ------------------- Class methods for GsAmqpFrame
category: 'Constants'
classmethod: GsAmqpFrame
AMQP_FRAME_BODY

^ 3
%
category: 'Constants'
classmethod: GsAmqpFrame
AMQP_FRAME_HEADER

^ 2
%
category: 'Constants'
classmethod: GsAmqpFrame
AMQP_FRAME_METHOD

^ 1
%
category: 'Constants'
classmethod: GsAmqpFrame
basicPropertiesClassId

"From amqp_framing.c"

^ 60
%
category: 'Instance Creation'
classmethod: GsAmqpFrame
newWithConnection: aGsAmqpConnection

	^(super new)
		connection: aGsAmqpConnection;
		yourself
%
category: 'Constants'
classmethod: GsAmqpFrame
sizeInC

^ 48
%
! ------------------- Instance methods for GsAmqpFrame
category: 'Accessing Header Members'
method: GsAmqpFrame
bodySize

"Valid only if isFrameHeader == true"
^ self uint64At: 16
%
category: 'Accessing Body Members'
method: GsAmqpFrame
bodyString

"Valid only if isFrameBody == true"
^ self stringFromAmqpBytesAtOffset: 8
%
category: 'Accessing'
method: GsAmqpFrame
channel
	^channel
%
category: 'Updating'
method: GsAmqpFrame
channel: newValue
	channel := newValue
%
category: 'Accessing'
method: GsAmqpFrame
connection
	^connection
%
category: 'Updating'
method: GsAmqpFrame
connection: newValue
	connection := newValue
%
category: 'Accessing Header Members'
method: GsAmqpFrame
extractBasicPropertiesPayload

"Only valid if isBasicPropertiesHeader == true"
^ GsAmqpBasicProperties fromCPointer: (self cPointerForOffset: 24)
%
category: 'Accessing Method Members'
method: GsAmqpFrame
extractMethodPayload

| result |
result := GsAmqpMethod fromCPointer: self atOffset: 8 initializeFromC: false.
^ result connection: self connection; initializeFromC

%
category: 'Accessing'
method: GsAmqpFrame
frameType
	^frameType
%
category: 'Updating'
method: GsAmqpFrame
frameType: newValue
	frameType := newValue
%
category: 'Initialization'
method: GsAmqpFrame
initializeForReuse

	^ self frameType: nil ;
		channel: nil ;
		payload: nil
		yourself
%
category: 'Initialization'
method: GsAmqpFrame
initializeFrameBodyFromC

	^self
		payload: (self stringFromAmqpBytesAtOffset: 8);
		yourself
%
category: 'Initialization'
method: GsAmqpFrame
initializeFrameHeaderFromC

	^self
		payload: self extractBasicPropertiesPayload;
		yourself
%
category: 'Initialization'
method: GsAmqpFrame
initializeFrameMethodFromC

	^self
		payload: self extractMethodPayload;
		yourself
%
category: 'Initialization'
method: GsAmqpFrame
initializeFromC

	self
		frameType: (self uint8At: 0);
		channel: (self uint16At: 2).
	self isFrameHeader
		ifTrue: [self initializeFrameHeaderFromC]
		ifFalse:
			[self isFrameMethod
				ifTrue: [self initializeFrameMethodFromC]
				ifFalse:
					[self isFrameBody
						ifTrue: [self initializeFrameBodyFromC]
						ifFalse: [self error: 'Unknown frame kind ']]]
%
category: 'Testing'
method: GsAmqpFrame
isBasicPropertiesHeader

^ self isFrameHeader and:[ self propertiesClassId == self class basicPropertiesClassId]
%
category: 'Testing'
method: GsAmqpFrame
isFrameBasicAckMethod

^ self isFrameMethod and:[ self methodId == GsAmqpMethod AMQP_BASIC_ACK_METHOD ]
%
category: 'Testing'
method: GsAmqpFrame
isFrameBasicDeliverMethod

^ self isFrameMethod and:[ self methodId == GsAmqpMethod AMQP_BASIC_DELIVER_METHOD ]
%
category: 'Testing'
method: GsAmqpFrame
isFrameBasicNackMethod

^ self isFrameMethod and:[ self methodId == GsAmqpMethod AMQP_BASIC_NACK_METHOD ]
%
category: 'Testing'
method: GsAmqpFrame
isFrameBasicRejectMethod

^ self isFrameMethod and:[ self methodId == GsAmqpMethod AMQP_BASIC_REJECT_METHOD ]
%
category: 'Testing'
method: GsAmqpFrame
isFrameBasicReturnMethod

^ self isFrameMethod and:[ self methodId == GsAmqpMethod AMQP_BASIC_RETURN_METHOD ]
%
category: 'Testing'
method: GsAmqpFrame
isFrameBody

^ self frameType == self class AMQP_FRAME_BODY
%
category: 'Testing'
method: GsAmqpFrame
isFrameHeader

^ self frameType == self class AMQP_FRAME_HEADER
%
category: 'Testing'
method: GsAmqpFrame
isFrameMethod

^ self frameType == self class AMQP_FRAME_METHOD
%
category: 'Accessing Method Members'
method: GsAmqpFrame
methodId

"Only valid if isFrameMethod == true"

^ self uint32At: 8
%
category: 'Accessing'
method: GsAmqpFrame
payload
	^payload
%
category: 'Updating'
method: GsAmqpFrame
payload: newValue
	payload := newValue
%
category: 'Accessing Header Members'
method: GsAmqpFrame
propertiesClassId

"Valid only if isFrameHeader == true"
^ self uint16At: 8
%
! ------------------- Remove existing behavior from GsAmqpBasicReturn
removeAllMethods GsAmqpBasicReturn
removeAllClassMethods GsAmqpBasicReturn
! ------------------- Class methods for GsAmqpBasicReturn
category: 'Constants'
classmethod: GsAmqpBasicReturn
sizeInC

^ 56
%
! ------------------- Instance methods for GsAmqpBasicReturn
category: 'Accessing'
method: GsAmqpBasicReturn
exchange
	^exchange
%
category: 'Updating'
method: GsAmqpBasicReturn
exchange: newValue
	exchange := newValue
%
category: 'Initialization'
method: GsAmqpBasicReturn
initializeFromC

	^self
		replyCode: (self uint16At: 0);
		replyText: (self stringFromAmqpBytesAtOffset: 8);
		exchange: (self stringFromAmqpBytesAtOffset: 24);
		routingKey: (self stringFromAmqpBytesAtOffset: 40);
		yourself
%
category: 'Accessing'
method: GsAmqpBasicReturn
replyCode
	^replyCode
%
category: 'Updating'
method: GsAmqpBasicReturn
replyCode: newValue
	replyCode := newValue
%
category: 'Accessing'
method: GsAmqpBasicReturn
replyText
	^replyText
%
category: 'Updating'
method: GsAmqpBasicReturn
replyText: newValue
	replyText := newValue
%
category: 'Accessing'
method: GsAmqpBasicReturn
routingKey
	^routingKey
%
category: 'Updating'
method: GsAmqpBasicReturn
routingKey: newValue
	routingKey := newValue
%
! ------------------- Remove existing behavior from GsAmqpQueueDeclareResult
removeAllMethods GsAmqpQueueDeclareResult
removeAllClassMethods GsAmqpQueueDeclareResult
! ------------------- Class methods for GsAmqpQueueDeclareResult
category: 'Constants'
classmethod: GsAmqpQueueDeclareResult
sizeInC

^ 24
%
! ------------------- Instance methods for GsAmqpQueueDeclareResult
category: 'Accessing'
method: GsAmqpQueueDeclareResult
consumerCount
	^consumerCount
%
category: 'Updating'
method: GsAmqpQueueDeclareResult
consumerCount: newValue
	consumerCount := newValue
%
category: 'Initialization'
method: GsAmqpQueueDeclareResult
initializeFromC

	^self
		queueName: (GsAmqpBytes fromCPointer: self) convertToString;
		consumerCount: (self uint32At: 20);
		messageCount: (self uint32At: 16);
		yourself
%
category: 'Accessing'
method: GsAmqpQueueDeclareResult
messageCount
	^messageCount
%
category: 'Updating'
method: GsAmqpQueueDeclareResult
messageCount: newValue
	messageCount := newValue
%
category: 'Accessing'
method: GsAmqpQueueDeclareResult
queueName
	^queueName
%
category: 'Updating'
method: GsAmqpQueueDeclareResult
queueName: newValue
	queueName := newValue
%
