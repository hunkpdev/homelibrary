package com.homelibrary.exception;

public class DemoRateLimitExceededException extends RuntimeException {

    private final String limitType;

    public DemoRateLimitExceededException(String limitType) {
        super("Demo rate limit exceeded: " + limitType);
        this.limitType = limitType;
    }

    public String getLimitType() {
        return limitType;
    }
}
