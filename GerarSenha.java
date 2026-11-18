package br.com.vendas.safe_market;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import java.util.Scanner;

public class GerarSenha {

    public static void main(String[] args) {

        Scanner scanner = new Scanner(System.in);
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

        System.out.print("Digite a nova senha: ");
        String senha = scanner.nextLine();

        String hash = encoder.encode(senha);

        System.out.println("Hash gerado:");
        System.out.println(hash);

        scanner.close();
    }
}