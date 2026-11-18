
package br.com.vendas.safe_market;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Scanner;

public class GerarSenha {

    public static void main(String[] args) {

        Scanner scanner = new Scanner(System.in);
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        System.out.print("Digite a nova senha:gabrielrenan123 ");
        String senha = scanner.nextLine();

        String hash = encoder.encode(senha);

        System.out.println("\nHash BCrypt gerado com sucesso!");
        System.out.println("Tamanho: " + hash.length());
        System.out.println("Validação: " + encoder.matches(senha, hash));
        System.out.println("\nHash:");
        System.out.println(hash);

        scanner.close();
    }
}
