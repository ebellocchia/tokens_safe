import { BigNumber, utils } from "ethers";

//
// Constants for testing
//

// Null address
export const NULL_ADDRESS: string = "0x0000000000000000000000000000000000000000";
// Unlimited amount
export const UINT256_MAX: BigNumber = BigNumber.from("115792089237316195423570985008687907853269984665640564039457584007913129639935");
// Some constants to be used in tests
export const TOKEN_SUPPLY: number = 1000000;
export const DUMMY_AMOUNT_1: number = TOKEN_SUPPLY / 100;
export const DUMMY_AMOUNT_2: number = TOKEN_SUPPLY / 50;
export const UNINITIALIZED_PASSWORD_HASH: string = "0x0000000000000000000000000000000000000000000000000000000000000000";

export const USER_1_INITIAL_PASSWORD: string = "user1_initial";
export const USER_1_PASSWORD_1: string = "user1_new1";
export const USER_1_PASSWORD_2: string = "user1_new2";

export const USER_2_INITIAL_PASSWORD: string = "user2_initial";
export const USER_2_PASSWORD_1: string = "user2_new1";
export const USER_2_PASSWORD_2: string = "user2_new2";
