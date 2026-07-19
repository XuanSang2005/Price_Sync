package price_sync.security;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.lang.NonNull;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import price_sync.domain.ConfigRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;

public class IpAllowListFilter extends OncePerRequestFilter {
    List<String> ipAllowList = new ArrayList<>();
    private final ConfigRepository configRepository; // chìa khóa tủ sổ

    public IpAllowListFilter(ConfigRepository configRepository) {
        this.configRepository = configRepository;
    }

    public void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain)
            throws ServletException, IOException {
                
        String raw = configRepository.findByConfigKey("ip_allowlist").map(c -> c.getConfigValue())
                .orElse("127.0.0.1,0:0:0:0:0:0:0:1");
        List<String> ipAllowList = new ArrayList<>();
        for (String ip : raw.split(",")) {
            ipAllowList.add(ip.trim());
        }

        String clientIp = request.getRemoteAddr();
        if (ipAllowList.contains(clientIp)) {
            filterChain.doFilter(request, response);
        } else {
            response.setStatus(403);
        }

    }

    @Override
    protected boolean shouldNotFilter(@org.springframework.lang.NonNull HttpServletRequest request) {
        return !request.getRequestURI().equals("/api/v1/price-events");
    }
}
