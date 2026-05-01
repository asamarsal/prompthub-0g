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
];
