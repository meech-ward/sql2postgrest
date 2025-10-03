package converter

import (
	"encoding/json"
)

type JSONOutput struct {
	Method  string            `json:"method"`
	URL     string            `json:"url"`
	Headers map[string]string `json:"headers,omitempty"`
	Body    interface{}       `json:"body,omitempty"`
}

func (c *Converter) ConvertToJSON(sql string) (string, error) {
	result, err := c.Convert(sql)
	if err != nil {
		return "", err
	}

	output := JSONOutput{
		Method:  result.Method,
		URL:     c.URL(result),
		Headers: result.Headers,
	}

	if result.Body != "" {
		var bodyJSON interface{}
		if err := json.Unmarshal([]byte(result.Body), &bodyJSON); err == nil {
			output.Body = bodyJSON
		} else {
			output.Body = result.Body
		}
	}

	jsonBytes, err := json.Marshal(output)
	if err != nil {
		return "", err
	}

	return string(jsonBytes), nil
}

func (c *Converter) ConvertToJSONPretty(sql string) (string, error) {
	result, err := c.Convert(sql)
	if err != nil {
		return "", err
	}

	output := JSONOutput{
		Method:  result.Method,
		URL:     c.URL(result),
		Headers: result.Headers,
	}

	if result.Body != "" {
		var bodyJSON interface{}
		if err := json.Unmarshal([]byte(result.Body), &bodyJSON); err == nil {
			output.Body = bodyJSON
		} else {
			output.Body = result.Body
		}
	}

	jsonBytes, err := json.MarshalIndent(output, "", "  ")
	if err != nil {
		return "", err
	}

	return string(jsonBytes), nil
}
