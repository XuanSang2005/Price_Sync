package price_sync.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.web.filter.OncePerRequestFilter;

import io.micrometer.common.lang.NonNull;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

public class HmacFIlter extends OncePerRequestFilter {

    private final String secret;

    public HmacFIlter(String secret) {
        this.secret = secret;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        CachedBodyHttpServletRequest cached = new CachedBodyHttpServletRequest(request);
        byte[] body = cached.getBody();

        String computed = computeHmac(body);
        String received = request.getHeader("X-Signature");

        if (received == null || !computed.equals((received))) {
            response.setStatus(401);
            return;
        }
        filterChain.doFilter(cached, response);
    }

    private String computeHmac(byte[] body) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] hmac = mac.doFinal(body);
            return HexFormat.of().formatHex(hmac);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }

}
