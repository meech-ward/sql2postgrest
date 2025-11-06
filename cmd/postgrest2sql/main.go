package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"os"
	"strings"

	"sql2postgrest/pkg/reverse"
)

const version = "2.0.0"

func main() {
	var (
		pretty       = flag.Bool("pretty", false, "Pretty print output")
		showVersion  = flag.Bool("version", false, "Show version")
		showWarnings = flag.Bool("warnings", false, "Show conversion warnings")
		method       = flag.String("method", "GET", "HTTP method (GET, POST, PATCH, DELETE)")
		path         = flag.String("path", "", "Request path (e.g., /users)")
		body         = flag.String("body", "", "Request body (JSON)")
	)

	flag.Parse()

	if *showVersion {
		fmt.Printf("postgrest2sql version %s\n", version)
		return
	}

	// Get query from args or stdin
	var query string
	if flag.NArg() > 0 {
		query = flag.Arg(0)
	} else {
		// Check if stdin has data
		stat, _ := os.Stdin.Stat()
		if (stat.Mode() & os.ModeCharDevice) == 0 {
			// Read from stdin
			bytes, err := io.ReadAll(os.Stdin)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Error reading stdin: %v\n", err)
				os.Exit(1)
			}
			query = strings.TrimSpace(string(bytes))
		}
	}

	// Extract path and query from full URL if needed
	if query == "" && *path == "" {
		fmt.Fprintln(os.Stderr, "Usage: postgrest2sql [OPTIONS] <query>")
		fmt.Fprintln(os.Stderr, "")
		fmt.Fprintln(os.Stderr, "Examples:")
		fmt.Fprintln(os.Stderr, "  postgrest2sql \"age=gte.18\" --path=/users")
		fmt.Fprintln(os.Stderr, "  postgrest2sql --method=POST --path=/users --body='{\"name\":\"Alice\"}'")
		fmt.Fprintln(os.Stderr, "  echo \"status=eq.active\" | postgrest2sql --path=/users")
		os.Exit(1)
	}

	// If query contains full URL format (e.g., "GET /users?age=gte.18"), parse it
	if strings.HasPrefix(query, "GET ") || strings.HasPrefix(query, "POST ") ||
		strings.HasPrefix(query, "PATCH ") || strings.HasPrefix(query, "DELETE ") {
		parts := strings.SplitN(query, " ", 2)
		if len(parts) == 2 {
			*method = parts[0]
			urlParts := strings.SplitN(parts[1], "?", 2)
			*path = urlParts[0]
			if len(urlParts) == 2 {
				query = urlParts[1]
			} else {
				query = ""
			}
		}
	}

	// Ensure path starts with /
	if *path != "" && !strings.HasPrefix(*path, "/") {
		*path = "/" + *path
	}

	// Convert
	conv := reverse.NewConverter()
	result, err := conv.Convert(*method, *path, query, *body)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	// Output
	if *pretty {
		output := map[string]interface{}{
			"sql": result.SQL,
		}
		if *showWarnings && len(result.Warnings) > 0 {
			output["warnings"] = result.Warnings
		}
		if len(result.Metadata) > 0 {
			output["metadata"] = result.Metadata
		}
		if result.HTTPRequest != nil {
			output["http"] = result.HTTPRequest
		}

		jsonBytes, err := json.MarshalIndent(output, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "Error formatting output: %v\n", err)
			os.Exit(1)
		}
		fmt.Println(string(jsonBytes))
	} else {
		// Simple output - just the SQL
		fmt.Println(result.SQL)

		// Show warnings if requested
		if *showWarnings && len(result.Warnings) > 0 {
			fmt.Fprintln(os.Stderr, "")
			fmt.Fprintln(os.Stderr, "Warnings:")
			for _, w := range result.Warnings {
				fmt.Fprintf(os.Stderr, "  - %s\n", w)
			}
		}
	}
}
