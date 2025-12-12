def merge_sort(arr, x):
	if len(arr) <= 1:
		return arr

	mid = len(arr)//2
	left = merge_sort(arr[:mid], x)
	right = merge_sort(arr[mid:], x)
	
	return merge(left, right, x)

def merge(left, right, x):
	i = 0
	j = 0
	result = []
	while i < len(left) and j < len(right):
		if left[i][x] < right[j][x]:
			result.append(left[i])	
			i+=1 
		else:
			result.append(right[j])
			j += 1
	result.extend(left[i:])
	result.extend(right[j:])
	return result

def main():
	array = [(1, 2), (3, 1), (5, 4), (2, 3)]
	sorted_array = merge_sort(array, 0)
	print(sorted_array)
		
main()