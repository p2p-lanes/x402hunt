import { hashTypedData, toHex, keccak256, encodeAbiParameters, parseAbiParameters } from 'viem'

const TARGET_SEPARATOR = '0x02fa7265e7c5d81118673727957699e4d68f74cd74b7db77da710fe8a2c7834f';
const VERIFYING_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CHAIN_ID = 8453;

const NAMES = ['USD Coin', 'USDC', 'FiatTokenV2', 'FiatTokenV2_1', 'Coinbase Wrapped Staked ETH'];
const VERSIONS = ['1', '2', '2.1'];

function calculateDomainSeparator(name: string, version: string) {
    // EIP-712 Domain Separator calculation
    // keccak256(abi.encode(
    //     keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
    //     keccak256(bytes(name)),
    //     keccak256(bytes(version)),
    //     chainId,
    //     verifyingContract
    // ))

    const TYPE_HASH = keccak256(toHex("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"));
    const nameHash = keccak256(toHex(name));
    const versionHash = keccak256(toHex(version));

    const encoded = encodeAbiParameters(
        parseAbiParameters('bytes32, bytes32, bytes32, uint256, address'),
        [TYPE_HASH, nameHash, versionHash, BigInt(CHAIN_ID), VERIFYING_CONTRACT as `0x${string}`]
    );

    return keccak256(encoded);
}

console.log(`Target: ${TARGET_SEPARATOR}`);

for (const name of NAMES) {
    for (const version of VERSIONS) {
        const separator = calculateDomainSeparator(name, version);
        console.log(`Name: "${name}", Version: "${version}" -> ${separator}`);
        if (separator === TARGET_SEPARATOR) {
            console.log(`\nMATCH FOUND!`);
            console.log(`Name: ${name}`);
            console.log(`Version: ${version}`);
            process.exit(0);
        }
    }
}

console.log('\nNo match found.');
