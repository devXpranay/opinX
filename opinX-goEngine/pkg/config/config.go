package config

import (
	"os"

	"gopkg.in/yaml.v2"
)

type Config struct {
	Redis  RedisConfig  `yaml:"redis"`
	PubSub PubSubConfig `yaml:"pubsub"`
}

type RedisConfig struct {
	Address  string `yaml:"address"`
	Password string `yaml:"password"`
	DB       int    `yaml:"db"`
}

type PubSubConfig struct {
	Channel string `yaml:"channel"`
}

// LoadConfig reads the configuration from a YAML file
func LoadConfig(filePath string) (*Config, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	var cfg Config
	decoder := yaml.NewDecoder(file)
	err = decoder.Decode(&cfg)
	if err != nil {
		return nil, err
	}

	return &cfg, nil
}
