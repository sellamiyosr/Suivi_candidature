package com.pfetracker.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.pfetracker.config.AppProperties;
import org.junit.jupiter.api.Test;

class SecretCipherTest {

    private SecretCipher cipher(String key) {
        AppProperties props = new AppProperties();
        props.setEncryptionKey(key);
        props.getJwt().setSecret("jwt-secret-for-tests-only-123456");
        return new SecretCipher(props);
    }

    @Test
    void roundTrip() {
        SecretCipher c = cipher("une-cle-de-test");
        String enc = c.encrypt("abcd efgh ijkl mnop");
        assertNotEquals("abcd efgh ijkl mnop", enc);
        assertEquals("abcd efgh ijkl mnop", c.decrypt(enc));
    }

    @Test
    void randomIvGivesDifferentCiphertexts() {
        SecretCipher c = cipher("k");
        assertNotEquals(c.encrypt("same"), c.encrypt("same"));
    }

    @Test
    void wrongKeyReturnsNull() {
        String enc = cipher("cle-1").encrypt("secret");
        assertNull(cipher("cle-2").decrypt(enc));
    }
}
