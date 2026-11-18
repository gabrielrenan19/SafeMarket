package br.com.vendas.safe_market.config;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;
import java.nio.file.Paths;
@Configuration public class UploadConfig implements WebMvcConfigurer {
 @Override public void addResourceHandlers(ResourceHandlerRegistry registry){registry.addResourceHandler("/uploads/**").addResourceLocations(Paths.get("uploads").toAbsolutePath().normalize().toUri().toString());}
}
