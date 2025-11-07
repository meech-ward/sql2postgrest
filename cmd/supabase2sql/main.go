package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"os"

	"sql2postgrest/pkg/reverse"
	"sql2postgrest/pkg/supabase"
)

func main() {
	// Command line flags
	pretty := flag.Bool("pretty", false, "Pretty print JSON output")
	baseURL := flag.String("url", "http://localhost:3000", "Base URL for PostgREST server (used for intermediate conversion)")
	flag.Parse()

	// Get the Supabase query from arguments
	args := flag.Args()
	if len(args) == 0 {
		fmt.Fprintf(os.Stderr, "Usage: supabase2sql [options] <supabase-query>\n")
		fmt.Fprintf(os.Stderr, "\nOptions:\n")
		flag.PrintDefaults()
		fmt.Fprintf(os.Stderr, "\nExamples:\n")
		fmt.Fprintf(os.Stderr, "  supabase2sql \"supabase.from('users').select('*')\"\n")
		fmt.Fprintf(os.Stderr, "  supabase2sql \"supabase.from('users').select('*').eq('age', 18)\"\n")
		fmt.Fprintf(os.Stderr, "  supabase2sql \"supabase.from('users').insert({name: 'John', age: 30})\"\n")
		fmt.Fprintf(os.Stderr, "  supabase2sql --pretty \"supabase.from('posts').select('*').order('created_at', {ascending: false}).limit(10)\"\n")
		os.Exit(1)
	}

	query := args[0]

	// Step 1: Convert Supabase → PostgREST
	supabaseConverter := supabase.NewConverter(*baseURL)
	postgrestResult, err := supabaseConverter.Convert(query)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error converting Supabase to PostgREST: %v\n", err)
		os.Exit(1)
	}

	// Check if it's an HTTP-only operation (can't convert to SQL)
	if postgrestResult.IsHTTPOnly {
		fmt.Fprintf(os.Stderr, "Error: Cannot convert to SQL\n")
		fmt.Fprintf(os.Stderr, "Reason: %s\n", postgrestResult.Description)
		if len(postgrestResult.Warnings) > 0 {
			fmt.Fprintf(os.Stderr, "Warnings:\n")
			for _, warning := range postgrestResult.Warnings {
				fmt.Fprintf(os.Stderr, "  - %s\n", warning)
			}
		}
		os.Exit(1)
	}

	// Step 2: Convert PostgREST → SQL
	reverseConverter := reverse.NewConverter()
	sqlResult, err := reverseConverter.Convert(
		postgrestResult.Method,
		postgrestResult.Path,
		postgrestResult.Query,
		postgrestResult.Body,
	)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error converting PostgREST to SQL: %v\n", err)
		os.Exit(1)
	}

	// Build output
	output := map[string]interface{}{
		"sql": sqlResult.SQL,
	}

	// Add intermediate PostgREST representation
	intermediate := map[string]interface{}{
		"method": postgrestResult.Method,
		"path":   postgrestResult.Path,
	}
	if postgrestResult.Query != "" {
		intermediate["query"] = postgrestResult.Query
	}
	if postgrestResult.Body != "" {
		intermediate["body"] = postgrestResult.Body
	}
	if len(postgrestResult.Headers) > 0 {
		intermediate["headers"] = postgrestResult.Headers
	}
	output["intermediate_postgrest"] = intermediate

	// Add warnings from both conversions
	allWarnings := []string{}
	if len(postgrestResult.Warnings) > 0 {
		allWarnings = append(allWarnings, postgrestResult.Warnings...)
	}
	if len(sqlResult.Warnings) > 0 {
		allWarnings = append(allWarnings, sqlResult.Warnings...)
	}
	if len(allWarnings) > 0 {
		output["warnings"] = allWarnings
	}

	// Add metadata if present
	if len(sqlResult.Metadata) > 0 {
		output["metadata"] = sqlResult.Metadata
	}

	// Add HTTP request info if present
	if sqlResult.HTTPRequest != nil {
		output["http"] = map[string]interface{}{
			"method":  sqlResult.HTTPRequest.Method,
			"url":     sqlResult.HTTPRequest.URL,
			"headers": sqlResult.HTTPRequest.Headers,
			"body":    sqlResult.HTTPRequest.Body,
		}
	}

	// Print JSON output
	var jsonBytes []byte
	if *pretty {
		jsonBytes, err = json.MarshalIndent(output, "", "  ")
	} else {
		jsonBytes, err = json.Marshal(output)
	}

	if err != nil {
		fmt.Fprintf(os.Stderr, "Error marshaling output: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(jsonBytes))
}
