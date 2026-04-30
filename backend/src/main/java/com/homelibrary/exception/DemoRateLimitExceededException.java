package com.homelibrary.exception;

public class DemoRateLimitExceededException extends RuntimeException {

    public DemoRateLimitExceededException(String limitType) {
        super("Demo rate limit exceeded: " + limitType);
    }
}
