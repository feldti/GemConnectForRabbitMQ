fileformat utf8
set compile_env: 0
! ------------------- Class definition for GsAmqpEntity
expectvalue /Class
doit
Object subclass: 'GsAmqpEntity'
  instVarNames: #( connection channel name
                    durable autoDelete)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpCStruct
expectvalue /Class
doit
CByteArray subclass: 'GsAmqpCStruct'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpConnection
expectvalue /Class
doit
Object subclass: 'GsAmqpConnection'
  instVarNames: #( library connection socket
                    openChannels highestOpenChannel replyObject host
                    port loggedIn connected)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpBasicProperties
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpBasicProperties'
  instVarNames: #( flags contentType contentEncoding
                    headers deliveryMode priority correlationId
                    replyTo expiration messageId timestamp
                    type amqpUserId appId clusterId)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpTable
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpTable'
  instVarNames: #( numEntries entries)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpExchange
expectvalue /Class
doit
GsAmqpEntity subclass: 'GsAmqpExchange'
  instVarNames: #( type)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpTableEntryArray
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpTableEntryArray'
  instVarNames: #( elements)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpFieldValue
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpFieldValue'
  instVarNames: #( kind value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpRpcReply
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpRpcReply'
  instVarNames: #( connection replyType methodNumber
                    libraryError method)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpTlsConnection
expectvalue /Class
doit
GsAmqpConnection subclass: 'GsAmqpTlsConnection'
  instVarNames: #( verifyPeer verifyHostname caCertPath
                    certPath privateKey)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpExample
expectvalue /Class
doit
Object subclass: 'GsAmqpExample'
  instVarNames: #()
  classVars: #( amqpUserId badMessages caCertPath certPath debugEnabled hostname loginTimeoutMs messages password port privateKey privateKeyPassphrase randomString tlsPort)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpHeadersExchange
expectvalue /Class
doit
GsAmqpExchange subclass: 'GsAmqpHeadersExchange'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpTopicExchange
expectvalue /Class
doit
GsAmqpExchange subclass: 'GsAmqpTopicExchange'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpFanoutExchange
expectvalue /Class
doit
GsAmqpExchange subclass: 'GsAmqpFanoutExchange'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpDirectExchange
expectvalue /Class
doit
GsAmqpExchange subclass: 'GsAmqpDirectExchange'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpTableEntry
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpTableEntry'
  instVarNames: #( key value)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpConfirmedMessage
expectvalue /Class
doit
Object subclass: 'GsAmqpConfirmedMessage'
  instVarNames: #( id message publisher
                    state)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpBasicAck
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpBasicAck'
  instVarNames: #( deliveryTag multiple)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpConnectionClose
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpConnectionClose'
  instVarNames: #( replyCode replyText classId
                    methodId)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpConfirmedMessagePublisher
expectvalue /Class
doit
Object subclass: 'GsAmqpConfirmedMessagePublisher'
  instVarNames: #( connection channel messageCount
                    exchange routingKey mandatory autoRemoveConfirmed
                    publishedMessages confirmedMessages rejectedMessages returnedMessages
                    messageDictionary)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsRabbitMqError
expectvalue /Class
doit
ExternalError subclass: 'GsRabbitMqError'
  instVarNames: #( replyType amqpErrorCode)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpChannelClose
expectvalue /Class
doit
GsAmqpConnectionClose subclass: 'GsAmqpChannelClose'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsLibRabbitMq
expectvalue /Class
doit
Object subclass: 'GsLibRabbitMq'
  instVarNames: #()
  classVars: #( Function_amqp_basic_ack Function_amqp_basic_cancel Function_amqp_basic_consume Function_amqp_basic_get Function_amqp_basic_nack Function_amqp_basic_publish Function_amqp_basic_qos Function_amqp_basic_recover Function_amqp_basic_reject Function_amqp_bytes_free Function_amqp_bytes_malloc Function_amqp_bytes_malloc_dup Function_amqp_channel_close Function_amqp_channel_flow Function_amqp_channel_open Function_amqp_confirm_select Function_amqp_connection_close Function_amqp_connection_update_secret Function_amqp_constant_is_hard_error Function_amqp_constant_name Function_amqp_consume_message Function_amqp_cstring_bytes Function_amqp_data_in_buffer Function_amqp_decode_method Function_amqp_decode_properties Function_amqp_decode_table Function_amqp_default_connection_info Function_amqp_destroy_connection Function_amqp_destroy_envelope Function_amqp_destroy_message Function_amqp_encode_method Function_amqp_encode_properties Function_amqp_encode_table Function_amqp_error_string Function_amqp_error_string2 Function_amqp_exchange_bind Function_amqp_exchange_declare Function_amqp_exchange_delete Function_amqp_exchange_unbind Function_amqp_frames_enqueued Function_amqp_get_channel_max Function_amqp_get_client_properties Function_amqp_get_frame_max Function_amqp_get_handshake_timeout Function_amqp_get_heartbeat Function_amqp_get_rpc_reply Function_amqp_get_rpc_timeout Function_amqp_get_server_properties Function_amqp_get_socket Function_amqp_get_sockfd Function_amqp_handle_input Function_amqp_initialize_ssl_library Function_amqp_login Function_amqp_login_with_properties Function_amqp_maybe_release_buffers Function_amqp_maybe_release_buffers_on_channel Function_amqp_method_has_content Function_amqp_method_name Function_amqp_new_connection Function_amqp_open_socket Function_amqp_parse_url Function_amqp_pool_alloc Function_amqp_pool_alloc_bytes Function_amqp_queue_bind Function_amqp_queue_declare Function_amqp_queue_delete Function_amqp_queue_purge Function_amqp_queue_unbind Function_amqp_read_message Function_amqp_release_buffers Function_amqp_release_buffers_ok Function_amqp_send_frame Function_amqp_send_header Function_amqp_send_method Function_amqp_set_handshake_timeout Function_amqp_set_initialize_ssl_library Function_amqp_set_rpc_timeout Function_amqp_set_sockfd Function_amqp_set_ssl_engine Function_amqp_simple_rpc Function_amqp_simple_rpc_decoded Function_amqp_simple_wait_frame Function_amqp_simple_wait_frame_noblock Function_amqp_simple_wait_method Function_amqp_socket_get_sockfd Function_amqp_socket_open Function_amqp_socket_open_noblock Function_amqp_ssl_socket_get_context Function_amqp_ssl_socket_new Function_amqp_ssl_socket_set_cacert Function_amqp_ssl_socket_set_key Function_amqp_ssl_socket_set_key_buffer Function_amqp_ssl_socket_set_key_engine Function_amqp_ssl_socket_set_key_passwd Function_amqp_ssl_socket_set_ssl_versions Function_amqp_ssl_socket_set_verify Function_amqp_ssl_socket_set_verify_hostname Function_amqp_ssl_socket_set_verify_peer Function_amqp_table_clone Function_amqp_table_entry_cmp Function_amqp_tcp_socket_new Function_amqp_tcp_socket_set_sockfd Function_amqp_tune_connection Function_amqp_tx_commit Function_amqp_tx_rollback Function_amqp_tx_select Function_amqp_uninitialize_ssl_library Function_amqp_version Function_amqp_version_number Function_empty_amqp_pool Function_init_amqp_pool Function_recycle_amqp_pool libraryPath)
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpMessage
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpMessage'
  instVarNames: #( properties body destroyed
                    bodyClass)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpBytes
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpBytes'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpBasicDeliveryPayload
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpBasicDeliveryPayload'
  instVarNames: #( consumerTag deliveryTag redelivered
                    exchange routingKey)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpMethod
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpMethod'
  instVarNames: #( connection methodNumber methodName
                    decoded methodObject)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpEnvelope
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpEnvelope'
  instVarNames: #( channel consumerTag deliveryTag
                    redelivered exchange routingKey message
                    destroyed messageBodyClass)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpBasicNack
expectvalue /Class
doit
GsAmqpBasicAck subclass: 'GsAmqpBasicNack'
  instVarNames: #( requeue)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpBasicReject
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpBasicReject'
  instVarNames: #( deliveryTag requeue)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpQueue
expectvalue /Class
doit
GsAmqpEntity subclass: 'GsAmqpQueue'
  instVarNames: #( exchange exclusive routingKey
                    consumerTag)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpFrame
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpFrame'
  instVarNames: #( connection frameType channel
                    payload)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpBasicReturn
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpBasicReturn'
  instVarNames: #( replyCode replyText exchange
                    routingKey)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
set compile_env: 0
! ------------------- Class definition for GsAmqpQueueDeclareResult
expectvalue /Class
doit
GsAmqpCStruct subclass: 'GsAmqpQueueDeclareResult'
  instVarNames: #( queueName consumerCount messageCount)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: GemConnectForRabbitMq
  options: #()

%
