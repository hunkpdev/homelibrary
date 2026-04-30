package com.homelibrary.exception;

public class InvalidIsbnException extends RuntimeException {

    public InvalidIsbnException() {
        super("Invalid ISBN format");
    }
}
