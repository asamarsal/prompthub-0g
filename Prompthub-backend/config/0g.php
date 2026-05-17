<?php

return [
    'network' => env('OG_NETWORK', 'testnet'),
    'chain_id' => (int) env('OG_CHAIN_ID', 16602),
    'rpc_url' => env('OG_RPC_URL', 'https://evmrpc-testnet.0g.ai'),

    // Contract addresses
    'marketplace_contract_address' => env('MARKETPLACE_CONTRACT_ADDRESS', ''),
    'escrow_contract_address' => env('ESCROW_CONTRACT_ADDRESS', ''),
    'contests_contract_address' => env('CONTESTS_CONTRACT_ADDRESS', ''),
    'treasury_contract_address' => env('TREASURY_CONTRACT_ADDRESS', ''),
    'agent_registry_address' => env('AGENT_REGISTRY_ADDRESS', ''),

    // 0G Storage configuration
    'storage_node_url' => env('OG_STORAGE_NODE_URL', 'https://storagenode-galileo.0g.ai'),
    'storage_indexer_url' => env('OG_STORAGE_INDEXER_URL', 'https://indexer-galileo.0g.ai'),
    'storage_flow_contract' => env('OG_STORAGE_FLOW_CONTRACT', ''),

    // 0G Compute / Private Computer configuration
    'compute_api_key' => env('ZG_COMPUTE_API_KEY'),
    'compute_base_url' => env('ZG_COMPUTE_BASE_URL', 'https://router-api.0g.ai/v1/proxy'),
    'compute_model' => env('ZG_COMPUTE_MODEL', '0GM-1.0-35B-A3B'),
    'compute_fallback_model' => env('ZG_COMPUTE_FALLBACK_MODEL', 'deepseek/deepseek-chat-v3-0324'),
];
