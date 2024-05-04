import { BigNumber, Contract, Signer } from "ethers";
import { expect } from "chai";
// Project
import * as constants from "./Constants";
import * as utils from "./Utils";


async function initPasswordAndDeposit(
  tokens_safe: Contract,
  mock_token: Contract,
  user_account: Signer,
  initial_password: string,
  amount: number
) : Promise<void> {
  const mock_token_conn: Contract = await mock_token.connect(user_account);
  const tokens_safe_conn: Contract = await tokens_safe.connect(user_account);

  await tokens_safe_conn.initPassword(utils.computePasswordHash(initial_password));
  await mock_token_conn.approve(tokens_safe.address, amount);
  await tokens_safe_conn.depositToken(mock_token.address, amount);
}

async function testDeposit(
  tokens_safe: Contract,
  mock_token: Contract,
  user_account: Signer,
  initial_password: string,
  amount: number
) : Promise<void> {
  const user_address: string = await user_account.getAddress();
  const user_init_balance: BigNumber = await mock_token.balanceOf(user_address);

  await initPasswordAndDeposit(
    tokens_safe,
    mock_token,
    user_account,
    initial_password,
    amount
  );

  await expect(await tokens_safe.connect(user_account).tokenBalance(mock_token.address))
    .to.equal(amount);
  await expect(await mock_token.balanceOf(user_address))
    .to.equal(user_init_balance.sub(amount));
}

async function testWithdraw(
  tokens_safe: Contract,
  mock_token: Contract,
  user_account: Signer,
  curr_password: string,
  new_password: string,
  amount: number
) : Promise<void> {
  const user_address: string = await user_account.getAddress();
  const tokens_safe_conn: Contract = await tokens_safe.connect(user_account);
  const user_init_balance: BigNumber = await mock_token.balanceOf(user_address);
  const safe_init_balance: BigNumber = await tokens_safe_conn.tokenBalance(mock_token.address);

  await tokens_safe_conn.withdrawToken(
    mock_token.address,
    amount,
    curr_password,
    utils.computePasswordHash(new_password)
  );

  await expect(await tokens_safe_conn.tokenBalance(mock_token.address))
    .to.equal(safe_init_balance.sub(amount));
  await expect(await mock_token.balanceOf(user_address))
    .to.equal(user_init_balance.add(amount));
}

describe("TokensSafe", () => {
  let test_ctx: utils.TestContext;

  beforeEach(async () => {
    test_ctx = await utils.initTestContext();
  });

  it("should allow to initialize the password for an account", async () => {
    const account_safe_before: utils.AccountSafe = await test_ctx.tokens_safe.accountSafes(test_ctx.user_1_address);
    expect(account_safe_before.passwordInitialized).to.equal(false);
    expect(account_safe_before.passwordHash).to.equal(constants.UNINITIALIZED_PASSWORD_HASH);

    const password_hash: string = utils.computePasswordHash(constants.USER_1_INITIAL_PASSWORD);

    await expect(await test_ctx.tokens_safe.connect(test_ctx.user_1_account).initPassword(password_hash))
      .to.emit(test_ctx.tokens_safe, "PasswordInitialized")
      .withArgs(test_ctx.user_1_address, password_hash);

    const account_safe_after: utils.AccountSafe = await test_ctx.tokens_safe.accountSafes(test_ctx.user_1_address);
    expect(account_safe_after.passwordInitialized).to.equal(true);
    expect(account_safe_after.passwordHash).to.equal(password_hash);
  });

  it("should allow to compute a password hash", async () => {
    await expect(await test_ctx.tokens_safe.computePasswordHash(constants.USER_1_INITIAL_PASSWORD))
      .to.equal(utils.computePasswordHash(constants.USER_1_INITIAL_PASSWORD));
    await expect(await test_ctx.tokens_safe.computePasswordHash(constants.USER_1_PASSWORD_1))
      .to.equal(utils.computePasswordHash(constants.USER_1_PASSWORD_1));
  });

  it("should allow to change password", async () => {
    const tokens_safe_conn: Contract = await test_ctx.tokens_safe.connect(test_ctx.user_1_account);
    const new_password_hash: string = utils.computePasswordHash(constants.USER_1_PASSWORD_1);

    await tokens_safe_conn.initPassword(utils.computePasswordHash(constants.USER_1_INITIAL_PASSWORD));
    await tokens_safe_conn.changePassword(constants.USER_1_INITIAL_PASSWORD, new_password_hash);

    const account_safe: utils.AccountSafe = await test_ctx.tokens_safe.accountSafes(test_ctx.user_1_address);
    expect(account_safe.passwordInitialized).to.equal(true);
    expect(account_safe.passwordHash).to.equal(new_password_hash);
  });

  it("should allow to deposit tokens if password is initialized", async () => {
    await testDeposit(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_1_account,
      constants.USER_1_INITIAL_PASSWORD,
      constants.DUMMY_AMOUNT_1
    );
    await testDeposit(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_2_account,
      constants.USER_2_INITIAL_PASSWORD,
      constants.DUMMY_AMOUNT_2
    );
  });

  it("should allow to withdraw tokens if password is correct", async () => {
    // User 1
    await initPasswordAndDeposit(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_1_account,
      constants.USER_1_INITIAL_PASSWORD,
      constants.DUMMY_AMOUNT_1
    );

    await testWithdraw(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_1_account,
      constants.USER_1_INITIAL_PASSWORD,
      constants.USER_1_PASSWORD_1,
      constants.DUMMY_AMOUNT_1
    );

    // User 2
    await initPasswordAndDeposit(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_2_account,
      constants.USER_2_INITIAL_PASSWORD,
      constants.DUMMY_AMOUNT_2
    );

    await testWithdraw(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_2_account,
      constants.USER_2_INITIAL_PASSWORD,
      constants.USER_2_PASSWORD_1,
      constants.DUMMY_AMOUNT_2 / 4
    );
    await testWithdraw(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_2_account,
      constants.USER_2_PASSWORD_1,
      constants.USER_2_PASSWORD_2,
      constants.DUMMY_AMOUNT_2 / 4
    );
  });

  it("should revert if setting the same password when changing it", async () => {
    const tokens_safe_conn: Contract = await test_ctx.tokens_safe.connect(test_ctx.user_1_account);
    const password_hash: string = utils.computePasswordHash(constants.USER_1_INITIAL_PASSWORD);

    await tokens_safe_conn.initPassword(password_hash);
    await expect(
      tokens_safe_conn.changePassword(constants.USER_1_INITIAL_PASSWORD, password_hash)
    )
      .to.be.revertedWithCustomError(test_ctx.tokens_safe, "PasswordSameError")
      .withArgs(test_ctx.user_1_address);
  });

  it("should revert if providing the wrong password when changing it", async () => {
    const tokens_safe_conn: Contract = await test_ctx.tokens_safe.connect(test_ctx.user_1_account);

    await tokens_safe_conn.initPassword(utils.computePasswordHash(constants.USER_1_INITIAL_PASSWORD));
    await expect(
      tokens_safe_conn.changePassword(constants.USER_1_PASSWORD_1, utils.computePasswordHash(constants.USER_1_PASSWORD_1))
    )
      .to.be.revertedWithCustomError(test_ctx.tokens_safe, "PasswordWrongError")
      .withArgs(test_ctx.user_1_address);
  });

  it("should revert if depositing tokens without initializing the password", async () => {
    await expect(
      test_ctx.tokens_safe.connect(test_ctx.user_1_account).depositToken(test_ctx.mock_token.address, constants.DUMMY_AMOUNT_1)
    )
      .to.be.revertedWithCustomError(test_ctx.tokens_safe, "PasswordNotInitializedError")
      .withArgs(test_ctx.user_1_address);
  });

  it("should revert if depositing zero tokens", async () => {
    const tokens_safe_conn: Contract = await test_ctx.tokens_safe.connect(test_ctx.user_1_account);

    await tokens_safe_conn.initPassword(utils.computePasswordHash(constants.USER_1_INITIAL_PASSWORD));
    await expect(tokens_safe_conn.depositToken(test_ctx.mock_token.address, 0))
      .to.be.revertedWithCustomError(test_ctx.tokens_safe, "AmountError")
      .withArgs(test_ctx.user_1_address, test_ctx.mock_token.address, 0);
  });

  it("should revert if depositing tokens without approving", async () => {
    const mock_token_conn: Contract = await test_ctx.mock_token.connect(test_ctx.user_1_account);
    const tokens_safe_conn: Contract = await test_ctx.tokens_safe.connect(test_ctx.user_1_account);

    await tokens_safe_conn.initPassword(utils.computePasswordHash(constants.USER_1_INITIAL_PASSWORD));
    await expect(tokens_safe_conn.depositToken(test_ctx.mock_token.address, constants.DUMMY_AMOUNT_1))
      .to.be.revertedWithCustomError(test_ctx.mock_token, "ERC20InsufficientAllowance")
      .withArgs(test_ctx.tokens_safe.address, 0, constants.DUMMY_AMOUNT_1);

    await mock_token_conn.approve(test_ctx.tokens_safe.address, constants.DUMMY_AMOUNT_1 - 1);
    await expect(tokens_safe_conn.depositToken(test_ctx.mock_token.address, constants.DUMMY_AMOUNT_1))
      .to.be.revertedWithCustomError(test_ctx.mock_token, "ERC20InsufficientAllowance")
      .withArgs(test_ctx.tokens_safe.address, constants.DUMMY_AMOUNT_1 - 1, constants.DUMMY_AMOUNT_1);
  });

  it("should revert if withdrawing zero tokens", async () => {
    await initPasswordAndDeposit(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_1_account,
      constants.USER_1_INITIAL_PASSWORD,
      constants.DUMMY_AMOUNT_1
    );

    await expect(
      test_ctx.tokens_safe.connect(test_ctx.user_1_account).withdrawToken(
        test_ctx.mock_token.address,
        0,
        constants.USER_1_INITIAL_PASSWORD,
        utils.computePasswordHash(constants.USER_1_PASSWORD_1)
    ))
      .to.be.revertedWithCustomError(test_ctx.tokens_safe, "AmountError")
      .withArgs(test_ctx.user_1_address, test_ctx.mock_token.address, 0);
  });

  it("should revert if withdrawing tokens by providing the wrong password", async () => {
    await initPasswordAndDeposit(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_1_account,
      constants.USER_1_INITIAL_PASSWORD,
      constants.DUMMY_AMOUNT_1
    );

    await expect(
      test_ctx.tokens_safe.connect(test_ctx.user_1_account).withdrawToken(
        test_ctx.mock_token.address,
        constants.DUMMY_AMOUNT_1,
        constants.USER_1_PASSWORD_1,
        utils.computePasswordHash(constants.USER_1_PASSWORD_1)
    ))
      .to.be.revertedWithCustomError(test_ctx.tokens_safe, "PasswordWrongError")
      .withArgs(test_ctx.user_1_address);
  });

  it("should revert if withdrawing tokens by providing the same password as the new one", async () => {
    await initPasswordAndDeposit(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_1_account,
      constants.USER_1_INITIAL_PASSWORD,
      constants.DUMMY_AMOUNT_1
    );

    await expect(
      test_ctx.tokens_safe.connect(test_ctx.user_1_account).withdrawToken(
        test_ctx.mock_token.address,
        constants.DUMMY_AMOUNT_1,
        constants.USER_1_INITIAL_PASSWORD,
        utils.computePasswordHash(constants.USER_1_INITIAL_PASSWORD)
    ))
      .to.be.revertedWithCustomError(test_ctx.tokens_safe, "PasswordSameError")
      .withArgs(test_ctx.user_1_address);
  });

  it("should revert if withdrawing more tokens then the deposited ones", async () => {
    await initPasswordAndDeposit(
      test_ctx.tokens_safe,
      test_ctx.mock_token,
      test_ctx.user_1_account,
      constants.USER_1_INITIAL_PASSWORD,
      constants.DUMMY_AMOUNT_1
    );

    const tokens_safe_conn: Contract = await test_ctx.tokens_safe.connect(test_ctx.user_1_account);
    const token_balance: BigNumber = await tokens_safe_conn.tokenBalance(test_ctx.mock_token.address);

    // One step
    await expect(tokens_safe_conn.withdrawToken(
      test_ctx.mock_token.address,
      token_balance.add(1),
      constants.USER_1_INITIAL_PASSWORD,
      utils.computePasswordHash(constants.USER_1_PASSWORD_1)
    ))
      .to.be.revertedWithCustomError(test_ctx.tokens_safe, "AmountError")
      .withArgs(test_ctx.user_1_address, test_ctx.mock_token.address, token_balance.add(1));

    // Multiple steps
    await tokens_safe_conn.withdrawToken(
      test_ctx.mock_token.address,
      token_balance.div(2),
      constants.USER_1_INITIAL_PASSWORD,
      utils.computePasswordHash(constants.USER_1_PASSWORD_1)
    );
    await expect(tokens_safe_conn.withdrawToken(
      test_ctx.mock_token.address,
      token_balance.div(2).add(1),
      constants.USER_1_PASSWORD_1,
      utils.computePasswordHash(constants.USER_1_PASSWORD_2)
    ))
      .to.be.revertedWithCustomError(test_ctx.tokens_safe, "AmountError")
      .withArgs(test_ctx.user_1_address, test_ctx.mock_token.address, token_balance.div(2).add(1));

  });
});
