import pytest
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service

BASE_URL = "http://3.136.159.159"

def get_chrome_options():
    options = Options()
    options.add_argument("--headless")           # Required for Jenkins/EC2
    options.add_argument("--no-sandbox")         # Required for root/Docker
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--remote-debugging-port=9222")
    return options

@pytest.fixture(scope="function")
def driver():
    """Fresh browser instance for each test."""
    options = get_chrome_options()
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(10)
    yield driver
    driver.quit()

@pytest.fixture(scope="function")
def app(driver):
    """Open the app home page before each test."""
    driver.get(BASE_URL)
    return driver