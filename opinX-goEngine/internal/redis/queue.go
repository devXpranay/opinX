package redis

type Queue interface {
	Push(message string) error
	Pop() (string, error)
}
