import { describe, expect, it } from 'vitest';
import { readableAuthError } from './loginGate';

describe('login gate errors', () => {
  it('turns a missing production account into an actionable sign-up prompt', () => {
    expect(
      readableAuthError(
        new Error('[Request ID: abc] Server Error Uncaught Error: InvalidAccountId')
      )
    ).toBe('No account exists for this email yet. Choose Sign up above.');
  });

  it('does not expose credential implementation errors', () => {
    expect(readableAuthError(new Error('InvalidSecret'))).toBe(
      'Incorrect password. Try again.'
    );
    expect(readableAuthError(new Error('Invalid password'))).toBe(
      'Choose a password with at least 8 characters.'
    );
  });

  it('directs an existing account back to sign-in', () => {
    expect(readableAuthError(new Error('Account owner@example.com already exists'))).toBe(
      'This account already exists. Choose Sign in above.'
    );
  });
});
