import requests
import time

class CurrencyService:
    def __init__(self):
        self.countries_cache = None
        self.last_cache_update = 0
        self.cache_duration = 3600  # 1 hour

    def get_countries_and_currencies(self):
        """Fetches country names and their primary currency codes."""
        if self.countries_cache and (time.time() - self.last_cache_update < self.cache_duration):
            return self.countries_cache

        try:
            url = "https://restcountries.com/v3.1/all?fields=name,currencies"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()

            processed_countries = []
            for item in data:
                name = item.get('name', {}).get('common')
                currencies = item.get('currencies', {})
                
                if name and currencies:
                    # Get the first currency (primary)
                    currency_code = list(currencies.keys())[0]
                    currency_info = currencies[currency_code]
                    processed_countries.append({
                        'name': name,
                        'currency_code': currency_code,
                        'currency_name': currency_info.get('name', ''),
                        'symbol': currency_info.get('symbol', '')
                    })

            # Sort by name
            processed_countries.sort(key=lambda x: x['name'])
            self.countries_cache = processed_countries
            self.last_cache_update = time.time()
            return processed_countries

        except Exception as e:
            print(f"Error fetching countries: {e}")
            return []

    def get_exchange_rates(self, base_currency):
        """Fetches current exchange rates for a base currency."""
        try:
            url = f"https://api.exchangerate-api.com/v4/latest/{base_currency}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            return response.json().get('rates', {})
        except Exception as e:
            print(f"Error fetching exchange rates for {base_currency}: {e}")
            return {}

# Global instance
currency_service = CurrencyService()
