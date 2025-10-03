package main

import (
	"bufio"
	"flag"
	"fmt"
	"os"
	"strings"

	"sql2postgrest/pkg/converter"
)

const version = "0.1.0"

func main() {
	baseURL := flag.String("url", "http://localhost:3000", "PostgREST base URL")
	showVersion := flag.Bool("version", false, "Show version")
	jsonPretty := flag.Bool("pretty", false, "Output as pretty JSON")
	flag.Parse()

	if *showVersion {
		fmt.Printf("sql2postgrest version %s\n", version)
		os.Exit(0)
	}

	args := flag.Args()

	var sql string
	if len(args) > 0 {
		sql = strings.Join(args, " ")
	} else {
		scanner := bufio.NewScanner(os.Stdin)
		var lines []string
		for scanner.Scan() {
			lines = append(lines, scanner.Text())
		}
		if err := scanner.Err(); err != nil {
			fmt.Fprintf(os.Stderr, "Error reading input: %v\n", err)
			os.Exit(1)
		}
		sql = strings.Join(lines, "\n")
	}

	sql = strings.TrimSpace(sql)
	if sql == "" {
		fmt.Fprintln(os.Stderr, "Usage: sql2postgrest [options] <SQL query>")
		fmt.Fprintln(os.Stderr, "   or: echo 'SELECT * FROM users' | sql2postgrest")
		flag.PrintDefaults()
		os.Exit(1)
	}

	conv := converter.NewConverter(*baseURL)

	var output string
	var err error
	if *jsonPretty {
		output, err = conv.ConvertToJSONPretty(sql)
	} else {
		output, err = conv.ConvertToJSON(sql)
	}
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(output)
}
