
package br.com.vendas.safe_market.config;

import java.util.Arrays;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class SecurityConfig {

    // ==========================================
    // CRIPTOGRAFIA DE SENHAS
    // ==========================================

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // ==========================================
    // CONTEXTO DE SEGURANÇA E SESSÃO
    // ==========================================

    @Bean
    public SecurityContextRepository securityContextRepository() {

        HttpSessionSecurityContextRepository repository =
                new HttpSessionSecurityContextRepository();

        repository.setAllowSessionCreation(true);

        return repository;
    }

    // ==========================================
    // CONFIGURAÇÃO CORS
    // ==========================================

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOrigins(Arrays.asList(
                "http://127.0.0.1:5500",
                "http://localhost:5500",
                "http://127.0.0.1:5501",
                "http://localhost:5501"
        ));

        config.setAllowedMethods(Arrays.asList(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
        ));

        config.setAllowedHeaders(Arrays.asList(
                "Origin",
                "Content-Type",
                "Accept",
                "Authorization",
                "X-XSRF-TOKEN",
                "X-Requested-With"
        ));

        config.setExposedHeaders(Arrays.asList(
                "Set-Cookie"
        ));

        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", config);

        return source;
    }

    // ==========================================
    // FILTRO PRINCIPAL DE SEGURANÇA
    // ==========================================

    @Bean
    public SecurityFilterChain filterChain(
            HttpSecurity http,
            SecurityContextRepository repository
    ) throws Exception {

        CookieCsrfTokenRepository csrf =
                CookieCsrfTokenRepository.withHttpOnlyFalse();

        csrf.setCookieName("XSRF-TOKEN");
        csrf.setHeaderName("X-XSRF-TOKEN");
        csrf.setCookiePath("/");

        CsrfTokenRequestAttributeHandler csrfHandler =
                new CsrfTokenRequestAttributeHandler();

        csrfHandler.setCsrfRequestAttributeName(null);

        http

            // CORS
            .cors(Customizer.withDefaults())

            // CONTEXTO DE SEGURANÇA
            .securityContext(context ->
                    context.securityContextRepository(repository)
            )

            // SESSÃO HTTP
            .sessionManagement(session ->
                    session.sessionCreationPolicy(
                            SessionCreationPolicy.IF_REQUIRED
                    )
            )

            // PROTEÇÃO CSRF
            .csrf(config -> config
                    .csrfTokenRepository(csrf)
                    .csrfTokenRequestHandler(csrfHandler)
            )

            // AUTORIZAÇÃO DAS ROTAS
            .authorizeHttpRequests(auth -> auth

                    // Requisições OPTIONS
                    .requestMatchers(HttpMethod.OPTIONS, "/**")
                    .permitAll()

                    // Autenticação pública
                    .requestMatchers(
                            "/api/auth/csrf",
                            "/api/auth/cadastro",
                            "/api/auth/login"
                    )
                    .permitAll()

                    // PRODUTOS - ÁREA ADMINISTRATIVA
                    // Exige sessão autenticada.
                    // O perfil ADMIN também é validado
                    // dentro do ProdutoController.
                    .requestMatchers(
                            HttpMethod.GET,
                            "/api/produtos/admin"
                    )
                    .authenticated()

                    // PRODUTOS - CONSULTA PÚBLICA
                    .requestMatchers(
                            HttpMethod.GET,
                            "/api/produtos",
                            "/api/produtos/**"
                    )
                    .permitAll()

                    // CADASTRO E ENVIO DE IMAGENS
                    .requestMatchers(
                            HttpMethod.POST,
                            "/api/produtos",
                            "/api/produtos/*/imagem"
                    )
                    .authenticated()

                    // ALTERAÇÃO DE PRODUTOS
                    .requestMatchers(
                            HttpMethod.PUT,
                            "/api/produtos/**"
                    )
                    .authenticated()

                    // ATUALIZAÇÃO PARCIAL
                    .requestMatchers(
                            HttpMethod.PATCH,
                            "/api/produtos/**"
                    )
                    .authenticated()

                    // EXCLUSÃO DE PRODUTOS
                    .requestMatchers(
                            HttpMethod.DELETE,
                            "/api/produtos/**"
                    )
                    .authenticated()

                    // ROTAS ADMINISTRATIVAS
                    .requestMatchers("/api/admin/**")
                    .hasRole("ADMIN")

                    // DEMAIS ROTAS DA API
                    .requestMatchers("/api/**")
                    .authenticated()

                    // DEMAIS RECURSOS
                    .anyRequest()
                    .permitAll()
            )

            // LOGIN PERSONALIZADO PELO AuthController
            .formLogin(form -> form.disable())

            // NÃO UTILIZAR HTTP BASIC
            .httpBasic(basic -> basic.disable());

        return http.build();
    }
}
